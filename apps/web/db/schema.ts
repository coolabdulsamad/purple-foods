// Purple Foods — database schema (Drizzle ORM, Postgres/Neon).
// Source of truth for DDL: infra/db/migrations/ in the purple-foods repo.
// This file mirrors it for typed queries from api/. Money is ALWAYS kobo
// (bigint). Ids are uuid.

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable since 0005: email/Google accounts may not have a phone yet.
    // Uniqueness lives in partial unique indexes (phone / lower(email) /
    // google_sub) created by migration 0005.
    phone: text("phone"),
    name: text("name"),
    email: text("email"),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["customer", "rider", "merchant", "admin"] })
      .notNull()
      .default("customer"),
    status: text("status", { enum: ["active", "suspended", "deleted"] })
      .notNull()
      .default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Mirror only — canonical DDL (partial unique indexes on phone,
    // lower(email), google_sub) lives in infra/db/migrations/0005.
    unique("users_phone_unique").on(t.phone),
    index("idx_users_email_lower").on(sql`lower(${t.email})`),
  ],
);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    state: text("state").notNull().default("FCT"),
    country: text("country").notNull().default("Nigeria"),
    isActive: boolean("is_active").notNull().default(true),
    // City centre coordinates (0006) — used for map previews and
    // nearest-area matching.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.name, t.state)],
);

export const areas = pgTable(
  "areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    baseDeliveryFeeKobo: bigint("base_delivery_fee_kobo", { mode: "bigint" })
      .notNull()
      .default(BigInt(90000)),
    etaMinMinutes: integer("eta_min_minutes").notNull().default(20),
    etaMaxMinutes: integer("eta_max_minutes").notNull().default(35),
    // Zone centre coordinates (0006) — delivery map + nearest-zone lookup.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.cityId, t.name),
    index("idx_areas_city").on(t.cityId).where(sql`${t.isActive}`),
  ],
);

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    kind: text("kind", { enum: ["restaurant", "grocery", "pharmacy"] })
      .notNull()
      .default("restaurant"),
    description: text("description"),
    phone: text("phone"),
    address: text("address"),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    promo: text("promo"),
    deliveryFeeKobo: bigint("delivery_fee_kobo", { mode: "bigint" }),
    etaMinMinutes: integer("eta_min_minutes"),
    etaMaxMinutes: integer("eta_max_minutes"),
    rating: numeric("rating", { precision: 2, scale: 1 })
      .notNull()
      .default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    isOpen: boolean("is_open").notNull().default(true),
    isApproved: boolean("is_approved").notNull().default(false),
    isListed: boolean("is_listed").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("idx_merchants_area").on(t.areaId).where(sql`${t.isListed}`),
    index("idx_merchants_owner").on(t.ownerUserId),
  ],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceKobo: bigint("price_kobo", { mode: "bigint" }).notNull(),
    category: text("category").notNull(),
    isSpicy: boolean("is_spicy").notNull().default(false),
    isPopular: boolean("is_popular").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    photoUrl: text("photo_url"),
    ...timestamps,
  },
  (t) => [
    index("idx_menu_items_merchant")
      .on(t.merchantId)
      .where(sql`${t.isAvailable}`),
    check("menu_items_price_nonneg", sql`${t.priceKobo} >= 0`),
  ],
);

export const riders = pgTable("riders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  vehicleType: text("vehicle_type", { enum: ["bike", "bicycle", "car"] })
    .notNull()
    .default("bike"),
  plateNumber: text("plate_number"),
  homeAreaId: uuid("home_area_id").references(() => areas.id),
  isApproved: boolean("is_approved").notNull().default(false),
  isOnline: boolean("is_online").notNull().default(false),
  ...timestamps,
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    humanRef: text("human_ref").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    riderId: uuid("rider_id").references(() => riders.id),
    deliveryAreaId: uuid("delivery_area_id")
      .notNull()
      .references(() => areas.id),
    status: text("status", {
      enum: ["received", "preparing", "on_the_way", "delivered", "cancelled"],
    })
      .notNull()
      .default("received"),
    paymentMethod: text("payment_method", {
      enum: ["paystack", "flutterwave", "cod"],
    }).notNull(),
    paymentStatus: text("payment_status", {
      enum: ["pending", "paid", "failed", "refunded"],
    })
      .notNull()
      .default("pending"),
    paymentRef: text("payment_ref"),
    subtotalKobo: bigint("subtotal_kobo", { mode: "bigint" }).notNull(),
    deliveryFeeKobo: bigint("delivery_fee_kobo", { mode: "bigint" })
      .notNull()
      .default(BigInt(0)),
    discountKobo: bigint("discount_kobo", { mode: "bigint" })
      .notNull()
      .default(BigInt(0)),
    totalKobo: bigint("total_kobo", { mode: "bigint" }).notNull(),
    deliveryName: text("delivery_name").notNull(),
    deliveryPhone: text("delivery_phone").notNull(),
    deliveryStreet: text("delivery_street").notNull(),
    deliveryNotes: text("delivery_notes").notNull().default(""),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [
    index("idx_orders_customer").on(t.customerId, t.placedAt),
    index("idx_orders_merchant_live")
      .on(t.merchantId, t.status)
      .where(sql`${t.status} <> 'delivered' AND ${t.status} <> 'cancelled'`),
    index("idx_orders_rider_live")
      .on(t.riderId)
      .where(sql`${t.status} = 'on_the_way'`),
    check("orders_subtotal_nonneg", sql`${t.subtotalKobo} >= 0`),
    check("orders_total_nonneg", sql`${t.totalKobo} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    nameSnapshot: text("name_snapshot").notNull(),
    unitPriceKobo: bigint("unit_price_kobo", { mode: "bigint" }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalKobo: bigint("line_total_kobo", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_order_items_order").on(t.orderId),
    check("order_items_qty_pos", sql`${t.quantity} > 0`),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    actorType: text("actor_type", {
      enum: ["customer", "merchant", "rider", "admin", "system"],
    })
      .notNull()
      .default("system"),
    actorId: uuid("actor_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_order_events_order").on(t.orderId, t.createdAt)],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id),
    entityType: text("entity_type", {
      enum: ["customer", "merchant", "rider", "platform"],
    }).notNull(),
    entityId: uuid("entity_id").notNull(),
    entryType: text("entry_type", {
      enum: ["charge", "payout", "commission", "refund", "adjustment"],
    }).notNull(),
    amountKobo: bigint("amount_kobo", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("NGN"),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_ledger_order").on(t.orderId),
    index("idx_ledger_entity").on(t.entityType, t.entityId, t.createdAt),
  ],
);

// ── Auth (0004_auth.sql) ───────────────────────────────────────────
// Only hashes are ever stored: OTP codes are HMAC-SHA256 (pepper =
// APP_SECRET), session tokens are opaque 256-bit values kept as SHA-256.

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose").notNull().default("login"),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_otp_codes_phone_created").on(t.phone, t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

// ── Customer data stores (0005_full_auth.sql) ──────────────────────

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    street: text("street").notNull(),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id),
    notes: text("notes").notNull().default(""),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("idx_addresses_user").on(t.userId)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.userId, t.merchantId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    kind: text("kind", { enum: ["order", "promo", "info"] })
      .notNull()
      .default("info"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_notifications_user").on(t.userId, t.createdAt)],
);

export const schema = {
  users,
  cities,
  areas,
  merchants,
  menuItems,
  riders,
  orders,
  orderItems,
  orderEvents,
  ledgerEntries,
  otpCodes,
  sessions,
  addresses,
  favorites,
  notifications,
};
