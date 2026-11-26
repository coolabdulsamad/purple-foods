import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { LocationPicker } from '../components/LocationPicker'
import { Grain, Mono } from '../ui'

/** Standalone location page (also the onboarding step) — same picker as the
 *  Home popup: geolocation, zone search, map, multi-city grouping. */
export default function LocationPage() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen bg-plum-deep text-lilac">
      <Grain />
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-8 pt-6 md:justify-center">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-fit rounded-full border border-lilac/25 p-2.5 text-lilac transition-colors hover:bg-lilac/10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <Mono className="mt-5 text-saffron">[STEP 1 · DELIVERY AREA]</Mono>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
          Where's the food going?
        </h1>
        <p className="mt-1 text-sm text-lilac/75">
          Six cities and counting — pick your zone and we'll show what's cooking around you.
        </p>
        <div className="mt-5 overflow-hidden rounded-3xl bg-card text-plum shadow-2xl">
          <LocationPicker onPicked={() => navigate('/')} />
        </div>
      </div>
    </div>
  )
}
