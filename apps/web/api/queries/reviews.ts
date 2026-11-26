import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import type { ReviewDto } from "@contracts/types";
import { merchants, orders, reviews, users } from "@db/schema";
import { getDb } from "./connection";

// ── Reviews & ratings ──────────────────────────────────────────────
// One review per delivered order. Merchant rating/review_count are
// recomputed from the reviews table on every submission so they can
// never drift.

export async function submitReview(args: {
  userId: string;
  orderId: string;
  rating: number;
  comment: string;
}): Promise<{ ok: true }> {
  const db = getDb();
  const rating = Math.round(args.rating);
  if (rating < 1 || rating > 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a rating between 1 and 5 stars.",
    });
  }
  const comment = args.comment.trim().slice(0, 500);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, args.orderId))
    .limit(1);
  if (!order || order.customerId !== args.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  }
  if (order.status !== "delivered") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You can rate an order after it's delivered.",
    });
  }

  try {
    await db.insert(reviews).values({
      userId: args.userId,
      merchantId: order.merchantId,
      orderId: order.id,
      rating,
      comment,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("reviews_order_id_key") || msg.includes("order_id")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You've already rated this order.",
      });
    }
    throw err;
  }

  // Recompute the merchant's public rating.
  const [agg] = await db
    .select({
      avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
      n: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.merchantId, order.merchantId));
  await db
    .update(merchants)
    .set({
      rating: Number(agg?.avg ?? 0).toFixed(1),
      reviewCount: agg?.n ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, order.merchantId));

  return { ok: true };
}

export async function listMerchantReviews(
  slug: string,
): Promise<ReviewDto[]> {
  const db = getDb();
  const rows = await db
    .select({ review: reviews, author: users.name })
    .from(reviews)
    .innerJoin(merchants, eq(reviews.merchantId, merchants.id))
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(merchants.slug, slug))
    .orderBy(desc(reviews.createdAt))
    .limit(30);
  return rows.map(({ review, author }) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    authorName: author?.trim() || "Purple Foods customer",
    createdAt: review.createdAt.toISOString(),
  }));
}
