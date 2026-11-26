import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Loader2, LocateFixed, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Grain, LoadingBlock, Mono } from '../ui'

/**
 * Onboarding step 2 — collect the delivery location like every serious
 * food app does: geolocation shortcut + explicit zone picker + optional
 * street so the first checkout is already prefilled.
 */
export default function LocationPage() {
  const { setArea, profile, saveProfile } = useStore()
  const navigate = useNavigate()
  const areasQuery = trpc.catalog.areas.useQuery()
  const [areaId, setAreaId] = useState('')
  const [street, setStreet] = useState(profile.street)
  const [locating, setLocating] = useState(false)

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location not available', { description: 'Pick your zone from the list instead.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false)
        // Zones are curated, not geofenced yet — confirm the match manually.
        toast.success('Location found', { description: 'Confirm the zone that matches where you are.' })
      },
      () => {
        setLocating(false)
        toast.error('Could not get your location', { description: 'Pick your zone from the list instead.' })
      },
      { timeout: 8000 },
    )
  }

  const cont = () => {
    const a = (areasQuery.data ?? []).find((x) => x.id === areaId)
    if (!a) {
      toast.error('Pick your Abuja zone', { description: 'Menus and delivery fees follow your zone.' })
      return
    }
    setArea({ id: a.id, name: a.name })
    if (street.trim()) saveProfile({ ...profile, street: street.trim() })
    navigate('/auth')
  }

  return (
    <div className="relative min-h-dvh bg-plum-deep px-5 pb-10 pt-14 text-lilac">
      <Grain />
      <Mono className="text-saffron">[STEP 1 OF 2 · LOCATION]</Mono>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight">
        Where should we
        <br />
        <span className="text-saffron">deliver?</span>
      </h1>
      <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-lilac/75">
        Your zone sets the kitchens you see, the delivery fee and the ETA. You can change it any time from the top bar.
      </p>

      <button
        onClick={useMyLocation}
        disabled={locating}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-lilac/25 bg-plum py-3.5 text-sm font-bold text-lilac transition-colors hover:bg-plum-ink active:scale-[0.98] disabled:opacity-60"
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4 text-saffron" aria-hidden="true" />}
        {locating ? 'Finding you…' : 'Use my current location'}
      </button>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-lilac/20" />
        <Mono className="text-lilac/60">[OR PICK YOUR ZONE]</Mono>
        <span className="h-px flex-1 bg-lilac/20" />
      </div>

      {areasQuery.isLoading ? (
        <LoadingBlock label="Loading Abuja zones…" />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Delivery zone">
          {(areasQuery.data ?? []).map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={areaId === a.id}
              onClick={() => setAreaId(a.id)}
              className={`rounded-2xl border px-3.5 py-3.5 text-left transition-colors duration-150 ${
                areaId === a.id ? 'border-saffron bg-saffron text-plum-deep' : 'border-lilac/20 bg-plum text-lilac hover:bg-plum-ink'
              }`}
            >
              <MapPin className={`mb-1 h-4 w-4 ${areaId === a.id ? 'text-plum-deep' : 'text-saffron'}`} aria-hidden="true" />
              <span className="block text-sm font-bold">{a.name}</span>
              <span className={`mt-0.5 block font-mono text-[10px] uppercase tracking-wider ${areaId === a.id ? 'text-plum-deep/70' : 'text-lilac/50'}`}>
                {a.etaMin}–{a.etaMax} min
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="ob-street" className="text-xs font-bold text-lilac/90">
          Street address <span className="font-normal text-lilac/50">(optional — saves time at checkout)</span>
        </label>
        <input
          id="ob-street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="e.g. 12B Aminu Kano Crescent, Wuse 2"
          className="mt-1.5 w-full rounded-xl border border-lilac/20 bg-plum px-4 py-3 text-sm text-lilac outline-none placeholder:text-lilac/35 focus:border-saffron"
        />
      </div>

      <button
        onClick={cont}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
