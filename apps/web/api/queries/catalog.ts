import { asc, eq } from "drizzle-orm";
import type {
  AreaDto,
  MenuItemDto,
  MenuItemSearchDto,
  RestaurantDetailDto,
  RestaurantDto,
} from "@contracts/types";
import { areas, merchants, menuItems } from "@db/schema";
import { getDb } from "./connection";

function toRestaurantDto(row: {
  merchant: typeof merchants.$inferSelect;
  area: typeof areas.$inferSelect;
}): RestaurantDto {
  const { merchant: m, area: a } = row;
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    areaId: a.id,
    areaName: a.name,
    tags: m.tags,
    promo: m.promo,
    // Merchant override wins; NULL falls back to the area default.
    deliveryFeeKobo: Number(m.deliveryFeeKobo ?? a.baseDeliveryFeeKobo),
    etaMin: m.etaMinMinutes ?? a.etaMinMinutes,
    etaMax: m.etaMaxMinutes ?? a.etaMaxMinutes,
    rating: Number(m.rating),
    reviewCount: m.reviewCount,
    isOpen: m.isOpen,
  };
}

export async function listAreas(): Promise<AreaDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(areas)
    .where(eq(areas.isActive, true))
    .orderBy(asc(areas.name));
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    baseDeliveryFeeKobo: Number(a.baseDeliveryFeeKobo),
    etaMin: a.etaMinMinutes,
    etaMax: a.etaMaxMinutes,
  }));
}

export async function listRestaurants(): Promise<RestaurantDto[]> {
  const db = getDb();
  const rows = await db
    .select({ merchant: merchants, area: areas })
    .from(merchants)
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(eq(merchants.isListed, true))
    .orderBy(asc(merchants.name));
  return rows.map(toRestaurantDto);
}

export async function getRestaurantBySlug(
  slug: string,
): Promise<RestaurantDetailDto | null> {
  const db = getDb();
  const rows = await db
    .select({ merchant: merchants, area: areas })
    .from(merchants)
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(eq(merchants.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.merchantId, row.merchant.id))
    .orderBy(asc(menuItems.category), asc(menuItems.name));

  const menu: MenuItemDto[] = items
    .filter((i) => i.isAvailable)
    .map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      priceKobo: Number(i.priceKobo),
      category: i.category,
      isSpicy: i.isSpicy,
      isPopular: i.isPopular,
    }));

  return { ...toRestaurantDto(row), menu };
}

/** Every available menu item across listed merchants, flattened with its
 *  restaurant — powers the Search page and item detail lookups. */
export async function listAllMenuItems(): Promise<MenuItemSearchDto[]> {
  const db = getDb();
  const rows = await db
    .select({ item: menuItems, merchant: merchants })
    .from(menuItems)
    .innerJoin(merchants, eq(menuItems.merchantId, merchants.id))
    .where(eq(merchants.isListed, true))
    .orderBy(asc(merchants.name), asc(menuItems.category), asc(menuItems.name));
  return rows
    .filter(({ item: i }) => i.isAvailable)
    .map(({ item: i, merchant: m }) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      priceKobo: Number(i.priceKobo),
      category: i.category,
      isSpicy: i.isSpicy,
      isPopular: i.isPopular,
      merchantId: m.id,
      merchantSlug: m.slug,
      merchantName: m.name,
    }));
}
