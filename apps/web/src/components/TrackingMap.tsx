import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { OrderDto, OrderStatus } from '../types'
import { customerIcon, kitchenIcon, riderIcon, tileLayer } from '../lib/map'

// Rider progress along the kitchen → customer route, by status. While
// on_the_way, progress advances with elapsed time against a nominal ride.
const BASE_FRACTION: Record<OrderStatus, number> = {
  received: 0.03,
  preparing: 0.08,
  on_the_way: 0.15,
  delivered: 1,
  cancelled: 0,
}
const NOMINAL_RIDE_MIN = 25

function targetFraction(o: OrderDto): number {
  const base = BASE_FRACTION[o.status]
  if (o.status !== 'on_the_way') return base
  const elapsedMin = (Date.now() - new Date(o.placedAt).getTime()) / 60000
  return Math.min(0.92, base + (elapsedMin / NOMINAL_RIDE_MIN) * 0.8)
}

/** Live order map: kitchen pin, customer pin, route line and a rider marker
 *  that glides along the route as the order progresses. OpenStreetMap by
 *  default; Google tiles when VITE_GOOGLE_MAPS_API_KEY is configured. */
export function TrackingMap({ order }: { order: OrderDto }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const riderRef = useRef<L.Marker | null>(null)
  const shownRef = useRef(0)

  const from: L.LatLngExpression | null =
    order.merchantLat != null && order.merchantLng != null ? [order.merchantLat, order.merchantLng] : null
  // Prefer the exact pin the customer dropped at checkout; fall back to
  // the delivery-zone center for orders placed before pins existed.
  const to: L.LatLngExpression | null =
    order.deliveryLat != null && order.deliveryLng != null
      ? [order.deliveryLat, order.deliveryLng]
      : order.deliveryAreaLat != null && order.deliveryAreaLng != null
        ? [order.deliveryAreaLat, order.deliveryAreaLng]
        : null

  useEffect(() => {
    if (!hostRef.current || !from || !to || mapRef.current) return
    const map = L.map(hostRef.current, { zoomControl: false, attributionControl: false })
    tileLayer().addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.polyline([from, to], {
      color: '#6D28D9',
      weight: 4,
      opacity: 0.75,
      dashArray: '1 7',
      lineCap: 'round',
    }).addTo(map)
    L.marker(from, { icon: kitchenIcon() }).addTo(map).bindTooltip(order.merchantName, { direction: 'top' })
    L.marker(to, { icon: customerIcon() })
      .addTo(map)
      .bindTooltip(order.deliveryLat != null ? 'Your drop-off pin' : 'Your delivery zone', { direction: 'top' })

    const start = L.latLng(from as [number, number])
    riderRef.current = L.marker(start, { icon: riderIcon(), zIndexOffset: 500 }).addTo(map)
    map.fitBounds(L.latLngBounds([from, to]).pad(0.45), { animate: false })
    mapRef.current = map
    const t = setTimeout(() => map.invalidateSize(), 60)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      riderRef.current = null
    }
    // Map instance is built once per mounted card; order updates only move
    // the rider via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Glide the rider toward the status-implied position, easing every second.
  useEffect(() => {
    if (!from || !to) return
    const a = L.latLng(from as [number, number])
    const b = L.latLng(to as [number, number])
    const target = targetFraction(order)
    const tick = () => {
      shownRef.current += (target - shownRef.current) * 0.25
      const lat = a.lat + (b.lat - a.lat) * shownRef.current
      const lng = a.lng + (b.lng - a.lng) * shownRef.current
      riderRef.current?.setLatLng([lat, lng])
    }
    tick()
    const id = setInterval(tick, 900)
    return () => clearInterval(id)
  }, [order, from, to])

  if (!from || !to) return null

  return (
    <div className="relative">
      <div ref={hostRef} className="h-60 w-full md:h-72" aria-label="Live delivery map" />
      <span className="absolute left-3 top-3 z-[500] rounded-full bg-plum-deep/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-saffron">
        Live tracking
      </span>
    </div>
  )
}
