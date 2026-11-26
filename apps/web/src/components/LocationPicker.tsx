import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { LocateFixed, Loader2, MapPin, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import type { AreaDto } from '../types'
import { Mono } from '../ui'
import { tileLayer, zoneIcon } from '../lib/map'

/** Interactive zone map — markers for every delivery zone, click to pick. */
function ZoneMap({
  areas,
  liveAreaIds,
  selectedId,
  onPick,
}: {
  areas: AreaDto[]
  liveAreaIds: Set<string>
  selectedId: string | undefined
  onPick: (a: AreaDto) => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    })
    tileLayer().addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const pts: L.LatLngExpression[] = []
    for (const a of areas) {
      if (a.lat == null || a.lng == null) continue
      const ll: L.LatLngExpression = [a.lat, a.lng]
      pts.push(ll)
      const marker = L.marker(ll, { icon: zoneIcon(a.id === selectedId) })
      marker.bindTooltip(`${a.name}, ${a.cityName}${liveAreaIds.has(a.id) ? '' : ' — launching soon'}`, {
        direction: 'top',
        offset: [0, -10],
      })
      marker.on('click', () => onPickRef.current(a))
      marker.addTo(layer)
    }
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts).pad(0.35), { animate: false })
    }
    // Dialogs/sheets resize around the map — nudge Leaflet to re-measure.
    const t = setTimeout(() => map.invalidateSize(), 60)
    return () => clearTimeout(t)
  }, [areas, selectedId, liveAreaIds])

  return (
    <div
      ref={hostRef}
      className="h-44 w-full overflow-hidden rounded-2xl border border-border bg-lilac/50 md:h-52"
      aria-label="Map of delivery zones — click a pin to pick your area"
    />
  )
}

/** Full location-picking experience: geolocation, search, map, city groups.
 *  Used by the Home popup dialog and the /location onboarding page. */
export function LocationPicker({ onPicked }: { onPicked?: (a: AreaDto) => void }) {
  const { area, setArea } = useStore()
  const utils = trpc.useUtils()
  const areasQuery = trpc.catalog.areas.useQuery()
  const restaurantsQuery = trpc.catalog.restaurants.useQuery()
  const [query, setQuery] = useState('')
  const [locating, setLocating] = useState(false)

  const liveAreaIds = useMemo(
    () => new Set((restaurantsQuery.data ?? []).map((r) => r.areaId)),
    [restaurantsQuery.data],
  )

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = areasQuery.data ?? []
    const filtered = q
      ? all.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.cityName.toLowerCase().includes(q) ||
            a.state.toLowerCase().includes(q),
        )
      : all
    const byCity = new Map<string, AreaDto[]>()
    for (const a of filtered) {
      const list = byCity.get(a.cityName) ?? []
      list.push(a)
      byCity.set(a.cityName, list)
    }
    return Array.from(byCity.entries()).map(([city, zones]) => ({
      city,
      state: zones[0].state,
      live: zones.some((z) => liveAreaIds.has(z.id)),
      zones,
    }))
  }, [areasQuery.data, query, liveAreaIds])

  const pick = (a: AreaDto, detail?: string) => {
    setArea({ id: a.id, name: a.name, cityName: a.cityName })
    toast.success(`Delivering to ${a.name}, ${a.cityName}`, {
      description: detail ?? `Fees and menus now follow ${a.name}.`,
    })
    onPicked?.(a)
  }

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('This browser has no geolocation', { description: 'Pick your zone from the list instead.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const match = await utils.catalog.nearestArea.fetch({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          pick(match.area, `Closest zone to you — about ${match.distanceKm.toFixed(1)} km away.`)
        } catch {
          toast.error('Could not match your position to a delivery zone', {
            description: 'Pick your zone from the list instead.',
          })
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        toast.error('Location permission denied', {
          description: 'Allow location access, or pick your zone from the list.',
        })
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  const mapAreas = useMemo(() => groups.flatMap((g) => g.zones), [groups])

  return (
    <div className="flex max-h-[82vh] flex-col">
      <div className="border-b border-border p-5 pb-4">
        <p className="font-display text-lg font-extrabold tracking-tight text-plum">Where should we deliver?</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick your city and zone — restaurants, fees and ETAs follow it.
        </p>
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-royal px-4 py-3 text-sm font-bold text-lilac transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search zone or city — Lekki, Wuse, GRA…"
            aria-label="Search delivery zones"
            className="w-full bg-transparent text-sm font-medium text-plum outline-none placeholder:text-muted-foreground/70"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground hover:text-plum">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pt-4">
        {mapAreas.some((a) => a.lat != null) && (
          <ZoneMap areas={mapAreas} liveAreaIds={liveAreaIds} selectedId={area?.id} onPick={(a) => pick(a)} />
        )}

        {areasQuery.isLoading && (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading delivery zones…</p>
        )}
        {areasQuery.isError && (
          <p className="py-6 text-center text-xs font-semibold text-destructive">
            Could not load zones — check your connection and retry.
          </p>
        )}
        {!areasQuery.isLoading && !areasQuery.isError && groups.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No zone matches “{query}” — try a city name like Lagos or Abuja.
          </p>
        )}

        {groups.map((g) => (
          <section key={g.city} className="mt-5 first:mt-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-extrabold tracking-tight text-plum">{g.city}</h3>
              <Mono className="text-muted-foreground">[{g.state.toUpperCase()}]</Mono>
              {g.live ? (
                <span className="ml-auto rounded-full bg-mint-soft px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mint">
                  Live
                </span>
              ) : (
                <span className="ml-auto rounded-full bg-saffron-soft px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-plum/70">
                  Launching soon
                </span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {g.zones.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pick(a)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                    a.id === area?.id
                      ? 'border-royal bg-lilac text-plum'
                      : 'border-border bg-background hover:bg-lilac'
                  }`}
                >
                  <MapPin className="mb-1 h-4 w-4 text-royal" aria-hidden="true" />
                  {a.name}
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {a.etaMin}–{a.etaMax} min
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          More cities unlock as kitchens come online — your zone is remembered for next time.
        </p>
      </div>
    </div>
  )
}
