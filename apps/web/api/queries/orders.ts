import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import type {
  CreateOrderResult,
  OrderDto,
  OrderItemDto,
  OrderItemOptionDto,
  PaymentMethod,
  SessionUserDto,
} from "@contracts/types";
import {
  areas,
  ledgerEntries,
  merchants,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
  orderEvents,
  orderItems,
  orders,
  users,
} from "@db/schema";
import { getDb } from "./connection";

// ── Phone normalization ────────────────────────────────────────────
// Nigeria-first: accept +2348012345678, 2348012345678, or 08012345678
// and always store E.164 (+234…). OTP auth lands in a later phase; for
// now the phone number is the customer's identity key.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  let e164: string;
  if (digits.startsWith("+234")) e164 = digits;
  else if (digits.startsWith("234")) e164 = `+${digits}`;
  else if (digits.startsWith("0")) e164 = `+234${digits.slice(1)}`;
  else e164 = `+234${digits}`;

  if (!/^\+234\d{10}$/.test(e164)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Enter a valid Nigerian phone number, e.g. 0801 234 5678 or +2348012345678.",
    });
  }
  return e164;
}

function newHumanRef(): string {
  return `PF-${1000 + Math.floor(Math.random() * 9000)}`;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  optionIds: string[];
  note: string;
  allergy: string;
  cutlery: boolean;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  street: string;
  notes: string;
  areaId: string;
  merchantSlug: string;
  paymentMethod: PaymentMethod;
  items: CreateOrderItemInput[];
}

export async function createOrder(
  input: CreateOrderInput,
  sessionUser?: SessionUserDto | null,
): Promise<CreateOrderResult> {
  const db = getDb();
  // A signed-in customer orders as their session identity. Delivery phone:
  // the session phone when they have one, otherwise the phone typed at
  // checkout (and we backfill it onto their account so future orders and
  // OTP sign-in follow the same number).
  const typedPhone = sessionUser?.phone ? null : normalizePhone(input.customerPhone);
  const phone = sessionUser?.phone ?? typedPhone!;
  const name = input.customerName.trim();
  const street = input.street.trim();
  if (!name) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required." });
  }
  if (!street) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Delivery address is required.",
    });
  }

  // ── Validate the restaurant ──────────────────────────────────────
  const merchantRows = await db
    .select({ merchant: merchants, area: areas })
    .from(merchants)
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(eq(merchants.slug, input.merchantSlug))
    .limit(1);
  const found = merchantRows[0];
  if (!found || !found.merchant.isListed) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This restaurant is not available.",
    });
  }
  const { merchant } = found;
  if (!merchant.isOpen) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${merchant.name} is closed right now.`,
    });
  }

  // Delivery area must exist and be active.
  const areaRows = await db
    .select()
    .from(areas)
    .where(eq(areas.id, input.areaId))
    .limit(1);
  const area = areaRows[0];
  if (!area || !area.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "We don't deliver to that area yet.",
    });
  }

  // ── Re-price everything server-side (never trust the client) ────
  const ids = input.items.map((i) => i.menuItemId);
  const menuRows = await db
    .select()
    .from(menuItems)
    .where(inArray(menuItems.id, ids));
  const byId = new Map(menuRows.map((m) => [m.id, m]));

  // Load every option group for these items (min/max rules) and every
  // selected option (for validation + pricing).
  const groupRows = await db
    .select()
    .from(menuItemOptionGroups)
    .where(inArray(menuItemOptionGroups.menuItemId, ids));
  const groupsByItem = new Map<string, typeof groupRows>();
  for (const g of groupRows) {
    const list = groupsByItem.get(g.menuItemId) ?? [];
    list.push(g);
    groupsByItem.set(g.menuItemId, list);
  }

  const wantedOptionIds = [
    ...new Set(input.items.flatMap((i) => i.optionIds ?? [])),
  ];
  const optionRows = wantedOptionIds.length
    ? await db
        .select({
          option: menuItemOptions,
          group: menuItemOptionGroups,
        })
        .from(menuItemOptions)
        .innerJoin(
          menuItemOptionGroups,
          eq(menuItemOptions.groupId, menuItemOptionGroups.id),
        )
        .where(inArray(menuItemOptions.id, wantedOptionIds))
    : [];
  const optionsById = new Map(optionRows.map((r) => [r.option.id, r]));

  type Line = {
    menuItemId: string;
    name: string;
    unitPriceKobo: bigint;
    quantity: number;
    lineTotalKobo: bigint;
    optionsSnapshot: OrderItemOptionDto[];
    note: string;
    allergy: string;
    cutlery: boolean;
  };
  const lines: Line[] = [];
  for (const item of input.items) {
    const m = byId.get(item.menuItemId);
    if (!m || m.merchantId !== merchant.id || !m.isAvailable) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One of the items is no longer available — please review your cart.",
      });
    }
    const qty = Math.floor(item.quantity);
    if (qty < 1 || qty > 20) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Item quantity must be between 1 and 20.",
      });
    }

    // Validate selected options against the item's groups.
    const selected: { option: typeof menuItemOptions.$inferSelect; group: typeof menuItemOptionGroups.$inferSelect }[] = [];
    const perGroup = new Map<string, number>();
    for (const optionId of item.optionIds ?? []) {
      const hit = optionsById.get(optionId);
      if (!hit || !hit.option.isAvailable || hit.group.menuItemId !== m.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `One of the add-ons for ${m.name} is no longer available — please review your cart.`,
        });
      }
      selected.push(hit);
      perGroup.set(hit.group.id, (perGroup.get(hit.group.id) ?? 0) + 1);
    }
    for (const g of groupsByItem.get(m.id) ?? []) {
      const n = perGroup.get(g.id) ?? 0;
      if (n < g.minSelect) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${m.name}: pick at least ${g.minSelect} in "${g.name}".`,
        });
      }
      if (n > g.maxSelect) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${m.name}: "${g.name}" allows at most ${g.maxSelect} add-on${g.maxSelect > 1 ? "s" : ""}.`,
        });
      }
    }

    const optionsSum = selected.reduce(
      (sum, s) => sum + s.option.priceKobo,
      BigInt(0),
    );
    const unitPrice = m.priceKobo + optionsSum;
    lines.push({
      menuItemId: m.id,
      name: m.name,
      unitPriceKobo: unitPrice,
      quantity: qty,
      lineTotalKobo: unitPrice * BigInt(qty),
      optionsSnapshot: selected.map((s) => ({
        group: s.group.name,
        name: s.option.name,
        priceKobo: Number(s.option.priceKobo),
      })),
      note: (item.note ?? "").trim().slice(0, 300),
      allergy: (item.allergy ?? "").trim().slice(0, 200),
      cutlery: !!item.cutlery,
    });
  }
  if (lines.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty." });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalKobo, BigInt(0));
  const deliveryFee = merchant.deliveryFeeKobo ?? area.baseDeliveryFeeKobo;
  const total = subtotal + deliveryFee;

  // ── Write order + items + audit event + ledger atomically ───────
  // human_ref has a unique constraint; retry a handful of times on the
  // (rare) collision.
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const humanRef = newHumanRef();
    try {
      return await db.transaction(async (tx) => {
        // Signed-in: pin the order to the session user. Guest: find or
        // create the customer by phone; refresh name/last_seen either way.
        let customerId: string;
        if (sessionUser) {
          customerId = sessionUser.id;
          const patch: Partial<typeof users.$inferInsert> = {
            name,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          };
          // Backfill phone for email/Google accounts on first order.
          if (!sessionUser.phone && typedPhone) patch.phone = typedPhone;
          try {
            await tx.update(users).set(patch).where(eq(users.id, customerId));
          } catch (err) {
            // Phone belongs to another account — keep the order, skip the
            // backfill (delivery phone is already stored on the order).
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes("users_phone_unique")) throw err;
            await tx
              .update(users)
              .set({ name, lastSeenAt: new Date(), updatedAt: new Date() })
              .where(eq(users.id, customerId));
          }
        } else {
          const existing = await tx
            .select()
            .from(users)
            .where(eq(users.phone, phone))
            .limit(1);
          if (existing[0]) {
            customerId = existing[0].id;
            await tx
              .update(users)
              .set({ name, lastSeenAt: new Date(), updatedAt: new Date() })
              .where(eq(users.id, customerId));
          } else {
            const created = await tx
              .insert(users)
              .values({ phone, name, role: "customer" })
              .returning({ id: users.id });
            customerId = created[0]!.id;
          }
        }

        const [order] = await tx
          .insert(orders)
          .values({
            humanRef,
            customerId,
            merchantId: merchant.id,
            deliveryAreaId: area.id,
            status: "received",
            paymentMethod: input.paymentMethod,
            // Card gateways land in the payments phase; COD stays pending
            // until the rider collects.
            paymentStatus: "pending",
            subtotalKobo: subtotal,
            deliveryFeeKobo: deliveryFee,
            discountKobo: BigInt(0),
            totalKobo: total,
            deliveryName: name,
            deliveryPhone: phone,
            deliveryStreet: street,
            deliveryNotes: input.notes.trim(),
          })
          .returning({ id: orders.id });

        await tx.insert(orderItems).values(
          lines.map((l) => ({
            orderId: order!.id,
            menuItemId: l.menuItemId,
            nameSnapshot: l.name,
            unitPriceKobo: l.unitPriceKobo,
            quantity: l.quantity,
            lineTotalKobo: l.lineTotalKobo,
            optionsSnapshot: l.optionsSnapshot,
            note: l.note,
            allergy: l.allergy,
            cutlery: l.cutlery,
          })),
        );

        await tx.insert(orderEvents).values({
          orderId: order!.id,
          status: "received",
          actorType: "customer",
          actorId: customerId,
          note:
            input.paymentMethod === "cod"
              ? "Order placed — pay on delivery"
              : `Order placed — ${input.paymentMethod} (gateway pending)`,
        });

        // Balanced ledger pair: customer owes, platform holds the claim.
        await tx.insert(ledgerEntries).values([
          {
            orderId: order!.id,
            entityType: "customer",
            entityId: customerId,
            entryType: "charge",
            amountKobo: -total,
            memo: `Order ${humanRef}`,
          },
          {
            orderId: order!.id,
            entityType: "platform",
            entityId: merchant.id,
            entryType: "charge",
            amountKobo: total,
            memo: `Order ${humanRef} receivable`,
          },
        ]);

        return {
          orderId: order!.id,
          humanRef,
          totalKobo: Number(total),
          status: "received" as const,
          paymentStatus: "pending" as const,
        };
      });
    } catch (err) {
      lastError = err;
      // Only retry on human_ref unique collisions; rethrow anything else.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("human_ref")) throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not place the order — please try again.",
      });
}

export async function listOrdersByUser(customerId: string): Promise<OrderDto[]> {
  const db = getDb();

  const orderRows = await db
    .select({ order: orders, merchant: merchants, area: areas })
    .from(orders)
    .innerJoin(merchants, eq(orders.merchantId, merchants.id))
    .innerJoin(areas, eq(orders.deliveryAreaId, areas.id))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.placedAt))
    .limit(50);

  if (orderRows.length === 0) return [];

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((r) => r.order.id),
      ),
    );
  const itemsByOrder = new Map<string, OrderItemDto[]>();
  for (const i of itemRows) {
    const list = itemsByOrder.get(i.orderId) ?? [];
    list.push({
      name: i.nameSnapshot,
      quantity: i.quantity,
      unitPriceKobo: Number(i.unitPriceKobo),
      lineTotalKobo: Number(i.lineTotalKobo),
      options: Array.isArray(i.optionsSnapshot)
        ? (i.optionsSnapshot as OrderItemOptionDto[])
        : [],
      note: i.note,
      allergy: i.allergy,
      cutlery: i.cutlery,
    });
    itemsByOrder.set(i.orderId, list);
  }

  return orderRows.map(({ order: o, merchant: m, area: a }) => ({
    id: o.id,
    humanRef: o.humanRef,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    subtotalKobo: Number(o.subtotalKobo),
    deliveryFeeKobo: Number(o.deliveryFeeKobo),
    totalKobo: Number(o.totalKobo),
    placedAt: o.placedAt.toISOString(),
    merchantName: m.name,
    merchantSlug: m.slug,
    deliveryName: o.deliveryName,
    deliveryPhone: o.deliveryPhone,
    deliveryStreet: o.deliveryStreet,
    deliveryNotes: o.deliveryNotes,
    deliveryAreaName: a.name,
    // Kitchen + delivery-zone coordinates for the live tracking map.
    merchantLat: m.lat == null ? null : Number(m.lat),
    merchantLng: m.lng == null ? null : Number(m.lng),
    deliveryAreaLat: a.lat,
    deliveryAreaLng: a.lng,
    items: itemsByOrder.get(o.id) ?? [],
  }));
}
