import type { GeoResultDto } from "@contracts/types";
import { log } from "../lib/logger";

// ── Address geocoding proxy (OpenStreetMap Nominatim) ─────────────
// The browser can't call Nominatim directly (CORS + the required
// identifying User-Agent), so search/reverse go through here. Results
// are cached in-process; Nigeria is biased via countrycodes=ng but
// not hard-locked, so landmark searches still resolve.

const UA = "PurpleFoods/1.0 (https://purplefoods.ng; support@purplefoods.ng)";
const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;
  const data = await load();
  cache.set(key, { at: Date.now(), data });
  // Keep the map from growing forever.
  if (cache.size > 500) cache.clear();
  return data;
}

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
}

function toDto(h: NominatimHit): GeoResultDto {
  return {
    label: h.display_name,
    lat: Number(h.lat),
    lng: Number(h.lon),
  };
}

/** Free-text address search — "Bannex Plaza Wuse 2" → candidate pins. */
export async function searchAddress(query: string): Promise<GeoResultDto[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  return cached(`s:${q.toLowerCase()}`, async () => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6` +
        `&countrycodes=ng&addressdetails=0&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return [];
      const hits = (await res.json()) as NominatimHit[];
      return hits.map(toDto);
    } catch (err) {
      // Geocoder unreachable (offline / blocked network) — degrade to
      // "no results" so the UI keeps working with manual pins.
      log.warn("geocoding search failed; returning empty", { err: String(err) });
      return [];
    }
  });
}

/** Pin drop → human-readable address label. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeoResultDto | null> {
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  return cached(key, async () => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${lat}&lon=${lng}&zoom=18`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return null;
      const hit = (await res.json()) as NominatimHit;
      if (!hit?.display_name) return null;
      return toDto(hit);
    } catch (err) {
      log.warn("geocoding reverse failed; returning null", { err: String(err) });
      return null;
    }
  });
}
