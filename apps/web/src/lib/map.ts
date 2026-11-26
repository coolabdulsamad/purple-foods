// Shared map helpers — Leaflet + tile providers.
//
// Tile strategy: OpenStreetMap by default (key-free). When the deploy
// provides VITE_GOOGLE_MAPS_API_KEY the storefront switches its raster
// tiles to Google Maps, so "Google maps" is one env var away without a
// code change. Everything else (geolocation, zone search, live tracking)
// works identically on either provider.
import L from 'leaflet'

export const GOOGLE_MAPS_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

export function tileLayer(): L.TileLayer {
  if (GOOGLE_MAPS_KEY) {
    return L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '© Google Maps',
    })
  }
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  })
}

function pin(html: string, size: number): L.DivIcon {
  return L.divIcon({
    html,
    className: 'pf-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const wrap = (inner: string, size: number) =>
  `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${inner}</div>`

/** Kitchen pin — purple disc with a flame. */
export function kitchenIcon(): L.DivIcon {
  return pin(
    wrap(
      `<div style="width:34px;height:34px;border-radius:9999px;background:#2E1065;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
       </div>`,
      40,
    ),
    40,
  )
}

/** Customer pin — saffron disc with a home. */
export function customerIcon(): L.DivIcon {
  return pin(
    wrap(
      `<div style="width:34px;height:34px;border-radius:9999px;background:#F59E0B;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E1065" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
       </div>`,
      40,
    ),
    40,
  )
}

/** Rider pin — royal disc with a bike, plus a soft pulse ring. */
export function riderIcon(): L.DivIcon {
  return pin(
    wrap(
      `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
         <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(109,40,217,.35);animation:pf-pulse 1.6s ease-out infinite"></div>
         <div style="width:30px;height:30px;border-radius:9999px;background:#6D28D9;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5F3FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
         </div>
       </div>`,
      44,
    ),
    44,
  )
}

/** Zone pin for the location picker map — small dot, highlights when active. */
export function zoneIcon(active: boolean): L.DivIcon {
  const size = active ? 18 : 12
  const bg = active ? '#6D28D9' : '#9333EA'
  return pin(
    wrap(
      `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:${active ? 3 : 2}px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>`,
      22,
    ),
    22,
  )
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
