import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import type { GeoResultDto } from '../types'
import { customerIcon, tileLayer } from '../lib/map'

export interface MapPick {
  lat: number
  lng: number
  /** Human-readable label from reverse geocoding / search (may be ''). */
  label: string
}

/** Interactive point-picker: search an address, drop or drag the pin, or
 *  use the device location. Reverse-geocodes every move so the parent gets
 *  a real address label alongside the coordinates. */
export function MapPicker({
  value,
  onPick,
  center,
  className = 'h-56 md:h-64',
}: {
  value: { lat: number; lng: number } | null
  onPick: (pick: MapPick) => void
  /** Fallback viewport (e.g. the selected delivery area) before a pin exists. */
  center?: { lat: number; lng: number } | null
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  const utils = trpc.useUtils()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResultDto[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Map lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return
    const start = center ?? { lat: 9.0765, lng: 7.3986 } // Abuja fallback
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([start.lat, start.lng], 14)
    tileLayer().addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const reverseAndReport = async (lat: number, lng: number) => {
      setResolving(true)
      try {
        const hit = await utils.geo.reverse.fetch({ lat, lng })
        onPickRef.current({ lat, lng, label: hit?.label ?? '' })
      } catch {
        onPickRef.current({ lat, lng, label: '' })
      } finally {
        setResolving(false)
      }
    }

    const placeMarker = (lat: number, lng: number, report: boolean) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: customerIcon(),
          draggable: true,
        })
          .addTo(map)
          .on('dragend', () => {
            const ll = markerRef.current!.getLatLng()
            void reverseAndReport(ll.lat, ll.lng)
          })
      }
      if (report) void reverseAndReport(lat, lng)
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng, true)
    })

    mapRef.current = map
    ;(map as L.Map & { _placeMarker?: typeof placeMarker })._placeMarker = placeMarker

    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-center when the fallback center changes and no pin exists yet.
  useEffect(() => {
    if (!center || value || !mapRef.current) return
    mapRef.current.setView([center.lat, center.lng], 14)
  }, [center, value])

  // Reflect an externally-set pin (e.g. picking a saved address).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return
    const place = (map as L.Map & { _placeMarker?: (a: number, b: number, c: boolean) => void })
      ._placeMarker
    place?.(value.lat, value.lng, false)
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15))
  }, [value])

  // ── Address search (debounced, server-proxied Nominatim) ─────────
  const runSearch = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.trim().length < 3) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const hits = await utils.geo.search.fetch({ query: q.trim() })
        setResults(hits)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
  }

  const chooseResult = (hit: GeoResultDto) => {
    setResults([])
    setQuery(hit.label.split(',').slice(0, 2).join(','))
    const map = mapRef.current
    if (map) map.setView([hit.lat, hit.lng], 17)
    const place = (map as L.Map & { _placeMarker?: (a: number, b: number, c: boolean) => void } | null)
      ?._placeMarker
    place?.(hit.lat, hit.lng, false)
    onPick({ lat: hit.lat, lng: hit.lng, label: hit.label })
  }

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('This browser has no geolocation')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude: lat, longitude: lng } = pos.coords
        const map = mapRef.current
        if (map) map.setView([lat, lng], 17)
        const place = (
          map as L.Map & { _placeMarker?: (a: number, b: number, c: boolean) => void } | null
        )?._placeMarker
        place?.(lat, lng, true)
      },
      () => {
        setLocating(false)
        toast.error('Location permission denied', {
          description: 'Allow access, or tap the map to drop the pin.',
        })
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative">
        <div className="absolute left-3 right-3 top-3 z-[500]">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                runSearch(e.target.value)
              }}
              placeholder="Search address — Wuse 2, Lekki Phase 1…"
              aria-label="Search for an address"
              className="w-full bg-transparent text-sm font-medium text-plum outline-none placeholder:text-muted-foreground/70"
            />
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-royal" aria-hidden="true" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                aria-label="Clear address search"
                className="text-muted-foreground hover:text-plum"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {results.length > 0 && (
            <ul className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {results.map((hit, i) => (
                <li key={`${hit.lat}-${hit.lng}-${i}`}>
                  <button
                    onClick={() => chooseResult(hit)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs font-medium text-plum transition-colors hover:bg-lilac"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-royal" aria-hidden="true" />
                    <span className="line-clamp-2">{hit.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div ref={hostRef} className={`w-full ${className}`} aria-label="Delivery location map" />

        <button
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Use my current location"
          className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-plum px-3 py-2 text-[11px] font-bold text-lilac shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-saffron" aria-hidden="true" />
          )}
          {locating ? 'Finding…' : 'My location'}
        </button>

        {resolving && (
          <span className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[10px] font-bold text-plum shadow backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin text-royal" aria-hidden="true" />
            Locating address…
          </span>
        )}
      </div>
      <p className="flex items-center gap-1.5 border-t border-border bg-lilac/60 px-3 py-2 text-[11px] font-medium text-plum/80">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-royal" aria-hidden="true" />
        Tap the map or drag the pin to mark the exact drop-off point.
      </p>
    </div>
  )
}
