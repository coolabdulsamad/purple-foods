import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedQuery, publicQuery } from "./middleware";
import {
  getRestaurantBySlug,
  listAreas,
  listRestaurants,
} from "./queries/catalog";
import { createOrder, listOrdersByUser } from "./queries/orders";
import { requestOtp, revokeSession, verifyOtp } from "./queries/auth";

const catalogRouter = createRouter({
  areas: publicQuery.query(() => listAreas()),

  restaurants: publicQuery.query(() => listRestaurants()),

  restaurant: publicQuery
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      const restaurant = await getRestaurantBySlug(input.slug);
      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found.",
        });
      }
      return restaurant;
    }),
});

const ordersRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(1).max(120),
        customerPhone: z.string().min(7).max(20),
        street: z.string().min(1).max(300),
        notes: z.string().max(500).default(""),
        areaId: z.string().uuid(),
        merchantSlug: z.string().min(1).max(80),
        paymentMethod: z.enum(["cod", "paystack", "flutterwave"]),
        items: z
          .array(
            z.object({
              menuItemId: z.string().uuid(),
              quantity: z.number().int().min(1).max(20),
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(({ input, ctx }) => createOrder(input, ctx.user)),

  // Signed-in customers only — orders are private to the session identity.
  mine: protectedQuery.query(({ ctx }) => listOrdersByUser(ctx.user.id)),
});

const authRouter = createRouter({
  requestOtp: publicQuery
    .input(z.object({ phone: z.string().min(7).max(20) }))
    .mutation(({ input }) => requestOtp(input.phone)),

  verifyOtp: publicQuery
    .input(
      z.object({
        phone: z.string().min(7).max(20),
        code: z.string().min(4).max(8),
      }),
    )
    .mutation(({ input }) => verifyOtp(input.phone, input.code)),

  me: protectedQuery.query(({ ctx }) => ctx.user),

  logout: publicQuery.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) await revokeSession(ctx.sessionToken);
    return { ok: true };
  }),
});

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  catalog: catalogRouter,
  orders: ordersRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
