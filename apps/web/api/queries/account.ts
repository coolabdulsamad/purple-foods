import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AddressDto, NotificationDto, RestaurantDto } from "@contracts/types";
import { addresses, areas, favorites, merchants, notifications } from "@db/schema";
import { getDb } from "./connection";

// ── Saved delivery addresses ───────────────────────────────────────

function toAddressDto(row: {
  address: typeof addresses.$inferSelect;
  area: typeof areas.$inferSelect;
}): AddressDto {
  return {
    id: row.address.id,
    label: row.address.label,
    street: row.address.street,
    areaId: row.address.areaId,
    areaName: row.area.name,
    notes: row.address.notes,
    isDefault: row.address.isDefault,
    lat: row.address.lat == null ? null : Number(row.address.lat),
    lng: row.address.lng == null ? null : Number(row.address.lng),
  };
}

export async function listAddresses(userId: string): Promise<AddressDto[]> {
  const db = getDb();
  const rows = await db
    .select({ address: addresses, area: areas })
    .from(addresses)
    .innerJoin(areas, eq(addresses.areaId, areas.id))
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return rows.map(toAddressDto);
}

export interface CreateAddressInput {
  label: string;
  street: string;
  areaId: string;
  notes: string;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput,
): Promise<AddressDto> {
  const db = getDb();
  const street = input.street.trim();
  if (street.length < 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Street and house number, please.",
    });
  }
  const [area] = await db
    .select()
    .from(areas)
    .where(eq(areas.id, input.areaId))
    .limit(1);
  if (!area || !area.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "We don't deliver to that area yet.",
    });
  }

  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId));
    // First address is always the default; an explicit default clears others.
    const makeDefault = input.isDefault || existing.length === 0;
    if (makeDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, userId));
    }
    const created = await tx
      .insert(addresses)
      .values({
        userId,
        label: input.label.trim() || "Home",
        street,
        areaId: input.areaId,
        notes: input.notes.trim(),
        isDefault: makeDefault,
        lat: input.lat == null ? null : String(input.lat),
        lng: input.lng == null ? null : String(input.lng),
      })
      .returning();
    return toAddressDto({ address: created[0]!, area });
  });
}

export async function deleteAddress(userId: string, id: string): Promise<{ ok: true }> {
  const db = getDb();
  const removed = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  if (!removed[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Address not found." });
  }
  return { ok: true };
}

export async function setDefaultAddress(
  userId: string,
  id: string,
): Promise<{ ok: true }> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
    const updated = await tx
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning({ id: addresses.id });
    if (!updated[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Address not found." });
    }
  });
  return { ok: true };
}

// ── Favorites ──────────────────────────────────────────────────────

export async function listFavorites(userId: string): Promise<RestaurantDto[]> {
  const db = getDb();
  const rows = await db
    .select({ merchant: merchants, area: areas })
    .from(favorites)
    .innerJoin(merchants, eq(favorites.merchantId, merchants.id))
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
  return rows.map(({ merchant: m, area: a }) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    areaId: a.id,
    areaName: a.name,
    tags: m.tags,
    promo: m.promo,
    deliveryFeeKobo: Number(m.deliveryFeeKobo ?? a.baseDeliveryFeeKobo),
    etaMin: m.etaMinMinutes ?? a.etaMinMinutes,
    etaMax: m.etaMaxMinutes ?? a.etaMaxMinutes,
    rating: Number(m.rating),
    reviewCount: m.reviewCount,
    isOpen: m.isOpen,
    coverUrl: m.coverUrl,
    logoUrl: m.logoUrl,
  }));
}

export async function listFavoriteIds(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ merchantId: favorites.merchantId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return rows.map((r) => r.merchantId);
}

export async function toggleFavorite(
  userId: string,
  merchantId: string,
): Promise<{ favorited: boolean }> {
  const db = getDb();
  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.merchantId, merchantId)))
    .limit(1);
  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    return { favorited: false };
  }
  const [merchant] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);
  if (!merchant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found." });
  }
  await db.insert(favorites).values({ userId, merchantId });
  return { favorited: true };
}

// ── Notifications inbox ────────────────────────────────────────────

export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markAllNotificationsRead(userId: string): Promise<{ ok: true }> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { ok: true };
}
