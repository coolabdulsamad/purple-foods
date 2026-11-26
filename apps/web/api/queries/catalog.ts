import { and, asc, eq, inArray } from "drizzle-orm";
import type {
  AreaDto,
  CityDto,
  MenuItemDto,
  MenuItemSearchDto,
  MenuOptionGroupDto,
  NearestAreaDto,
  RestaurantDetailDto,
  RestaurantDto,
} from "@contracts/types";
import {
  areas,
  cities,
  merchants,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
} from "@db/schema";
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

export async function listCities(): Promise<CityDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name));
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    state: c.state,
    lat: c.lat,
    lng: c.lng,
  }));
}

function toAreaDto(a: typeof areas.$inferSelect, c: typeof cities.$inferSelect): AreaDto {
  return {
    id: a.id,
    name: a.name,
    cityId: c.id,
    cityName: c.name,
    state: c.state,
    lat: a.lat,
    lng: a.lng,
    baseDeliveryFeeKobo: Number(a.baseDeliveryFeeKobo),
    etaMin: a.etaMinMinutes,
    etaMax: a.etaMaxMinutes,
  };
}

export async function listAreas(): Promise<AreaDto[]> {
  const db = getDb();
  const rows = await db
    .select({ area: areas, city: cities })
    .from(areas)
    .innerJoin(cities, eq(areas.cityId, cities.id))
    .where(and(eq(areas.isActive, true), eq(cities.isActive, true)))
    .orderBy(asc(cities.name), asc(areas.name));
  return rows.map(({ area, city }) => toAreaDto(area, city));
}

/** Great-circle distance in km — good enough for zone matching at city scale. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Match device coordinates to the closest active delivery zone. */
export async function nearestArea(lat: number, lng: number): Promise<NearestAreaDto | null> {
  const all = await listAreas();
  let best: NearestAreaDto | null = null;
  for (const area of all) {
    if (area.lat == null || area.lng == null) continue;
    const distanceKm = haversineKm(lat, lng, area.lat, area.lng);
    if (!best || distanceKm < best.distanceKm) best = { area, distanceKm };
  }
  return best;
}

export async function listRestaurants(areaId?: string): Promise<RestaurantDto[]> {
  const db = getDb();
  const rows = await db
    .select({ merchant: merchants, area: areas })
    .from(merchants)
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(
      areaId
        ? and(eq(merchants.isListed, true), eq(merchants.areaId, areaId))
        : eq(merchants.isListed, true),
    )
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

  const available = items.filter((i) => i.isAvailable);
  const groupsByItem = await loadOptionGroups(available.map((i) => i.id));

  const menu: MenuItemDto[] = available.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    priceKobo: Number(i.priceKobo),
    category: i.category,
    isSpicy: i.isSpicy,
    isPopular: i.isPopular,
    photoUrl: i.photoUrl,
    optionGroups: groupsByItem.get(i.id) ?? [],
  }));

  return { ...toRestaurantDto(row), menu };
}

/** Load topping groups + options for a set of menu items (two queries). */
async function loadOptionGroups(
  itemIds: string[],
): Promise<Map<string, MenuOptionGroupDto[]>> {
  const out = new Map<string, MenuOptionGroupDto[]>();
  if (itemIds.length === 0) return out;
  const db = getDb();

  const groupRows = await db
    .select()
    .from(menuItemOptionGroups)
    .where(inArray(menuItemOptionGroups.menuItemId, itemIds))
    .orderBy(asc(menuItemOptionGroups.sortOrder), asc(menuItemOptionGroups.name));
  if (groupRows.length === 0) return out;

  const optionRows = await db
    .select()
    .from(menuItemOptions)
    .where(
      inArray(
        menuItemOptions.groupId,
        groupRows.map((g) => g.id),
      ),
    )
    .orderBy(asc(menuItemOptions.sortOrder), asc(menuItemOptions.name));

  const optionsByGroup = new Map<string, MenuOptionGroupDto["options"]>();
  for (const o of optionRows) {
    if (!o.isAvailable) continue;
    const list = optionsByGroup.get(o.groupId) ?? [];
    list.push({ id: o.id, name: o.name, priceKobo: Number(o.priceKobo) });
    optionsByGroup.set(o.groupId, list);
  }

  for (const g of groupRows) {
    const list = out.get(g.menuItemId) ?? [];
    list.push({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: optionsByGroup.get(g.id) ?? [],
    });
    out.set(g.menuItemId, list);
  }
  return out;
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
      photoUrl: i.photoUrl,
      // Groups are loaded through catalog.restaurant on the item page.
      optionGroups: [],
      merchantId: m.id,
      merchantSlug: m.slug,
      merchantName: m.name,
    }));
}
