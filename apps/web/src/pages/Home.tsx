import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { LocationDialog } from '../components/LocationDialog'
import { DishArt, ErrorBlock, Grain, LoadingBlock, Marquee, Mono, Rating, fmt } from '../ui'
import heroFood from '../assets/hero-food.svg'

export default function HomePage() {
  const { area, session } = useStore()
  const [cat, setCat] = useState('All')
  const [showAll, setShowAll] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const askedRef = useRef(false)
  const navigate = useNavigate()

  // First visit (no zone picked yet): pop the location dialog so the feed
  // immediately reflects where the customer actually is. Once dismissed or
  // answered we don't auto-pop again — the TopBar button reopens it.
  useEffect(() => {
    if (askedRef.current) return
    askedRef.current = true
    if (!area) setLocOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const areaId = area && !showAll ? area.id : undefined
  const restaurantsQuery = trpc.catalog.restaurants.useQuery({ areaId })

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of restaurantsQuery.data ?? []) r.tags.forEach((t) => set.add(t))
    return ['All', ...Array.from(set).sort()]
  }, [restaurantsQuery.data])

  const filtered = useMemo(
    () => (restaurantsQuery.data ?? []).filter((r) => cat === 'All' || r.tags.includes(cat)),
    [restaurantsQuery.data, cat],
  )

  const promos = [
    {
      bg: 'bg-saffron text-plum-deep',
      rotate: '-rotate-[1.5deg]',
      title: 'Free delivery on your first order',
      body: 'No code needed — applied automatically at checkout while the launch window lasts.',
      cta: 'Order now',
      action: () => document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' }),
    },
    {
      rotate: 'rotate-[1deg]',
      title: 'Invite friends, eat free',
      body: 'Your code gives them ₦1,000 off. You get a free delivery credit when their first order lands.',
      cta: 'Get my code',
      action: () => navigate('/promos'),
    },
    {
      rotate: '-rotate-[1deg]',
      title: 'Suya nights, till 2am',
      body: 'Late grills from Wuse to Gwarinpa. Yaji-heavy, flame-first, still hot at your door.',
      cta: 'See grills',
      action: () => navigate(`/category/${encodeURIComponent('Suya & Grill')}`),
    },
  ]

  const firstName = session?.user.name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const cityLabel = area?.cityName ?? 'Nigeria'

  return (
    <div>
      <LocationDialog open={locOpen} onClose={() => setLocOpen(false)} />

      <section className="relative overflow-hidden bg-plum-deep text-lilac">
        <Grain />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-10 pt-24 md:grid-cols-[1.1fr_1fr] md:items-center md:px-8 md:pb-16 md:pt-36">
          <div>
            <Mono className="text-saffron">[{cityLabel.toUpperCase()}{area ? ` · ${area.name.toUpperCase()}` : ''}]</Mono>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
              {firstName ? `${greeting}, ${firstName}.` : 'Hungry?'}
              <br />
              {cityLabel} is <span className="text-saffron">served hot.</span>
            </h1>
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-lilac/80 md:max-w-[46ch] md:text-base">
              Restaurants, grills and bukas around you — tracked live on the map from flame to your doorstep.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="mt-5 flex w-full items-center gap-2 rounded-2xl bg-lilac px-4 py-3 text-left text-plum shadow-lg md:max-w-xl md:py-4"
            >
              <Search className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
              <span className="text-sm font-medium text-plum/50">Search amala, suya, shawarma…</span>
            </button>
            {!area && (
              <button
                onClick={() => setLocOpen(true)}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-saffron/50 px-4 py-2 text-xs font-bold text-saffron transition-colors hover:bg-saffron/10"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Set your delivery area
              </button>
            )}
            {!session && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link
                  to="/auth/signup"
                  className="rounded-full bg-saffron px-5 py-2.5 text-sm font-bold text-plum-deep transition-transform active:scale-95"
                >
                  Create account
                </Link>
                <Link
                  to="/auth"
                  className="rounded-full border border-lilac/30 px-5 py-2.5 text-sm font-bold text-lilac transition-colors hover:bg-lilac/10"
                >
                  Sign in
                </Link>
                <span className="text-xs text-lilac/60">or order as a guest — no account needed</span>
              </div>
            )}
            <div className="mt-10 hidden gap-10 md:flex">
              {[
                [`${restaurantsQuery.data?.length ?? '…'}`, 'kitchens live'],
                ['12-min', 'warmth SLA'],
                ['₦0', 'first delivery fee'],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-extrabold text-saffron">{v}</p>
                  <Mono className="mt-1 block text-lilac/60">[{l.toUpperCase()}]</Mono>
                </div>
              ))}
            </div>
          </div>

          {/* Hero plate — desktop only; mobile keeps the tight single column. */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-royal/40 blur-2xl" aria-hidden="true" />
            <img
              src={heroFood}
              alt="A spread of Nigerian dishes — jollof rice, suya, amala and grilled chicken"
              className="relative aspect-[5/4] w-full rotate-[1.5deg] rounded-[2rem] border-4 border-lilac/15 object-cover shadow-2xl"
            />
            <div className="absolute -bottom-4 -left-4 -rotate-[2deg] rounded-2xl bg-saffron px-4 py-2.5 shadow-xl">
              <Mono className="block text-plum-deep">[FLAME → DOOR · LIVE MAP]</Mono>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={['Free delivery on first order', 'Invite friends — earn ₦1,000', 'Suya nights till 2am', 'PurpleMart groceries loading']} />

      <div className="no-scrollbar mx-auto mt-5 flex w-full max-w-7xl gap-2 overflow-x-auto px-4 pb-1 md:flex-wrap md:px-8" role="tablist" aria-label="Cuisine categories">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors duration-150 ${
              cat === c ? 'border-plum bg-plum text-lilac' : 'border-border bg-card text-plum hover:bg-lilac'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mx-auto mt-5 flex w-full max-w-7xl gap-3 overflow-x-auto px-4 pb-2 pt-1 md:grid md:grid-cols-3 md:px-8">
        {promos.map((p) => (
          <article key={p.title} className={`flex w-[78%] shrink-0 flex-col rounded-2xl p-4 shadow-md transition-transform duration-200 md:w-auto md:p-5 ${p.rotate} ${p.bg ?? 'bg-royal text-lilac'}`}>
            <h2 className="font-display text-lg font-extrabold leading-tight tracking-tight">{p.title}</h2>
            <p className="mt-1 text-xs leading-relaxed opacity-85">{p.body}</p>
            <button
              onClick={p.action}
              className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-plum-deep px-3.5 py-1.5 text-xs font-bold text-lilac transition-transform duration-150 hover:gap-2 active:scale-95"
            >
              {p.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      <section id="feed" className="mx-auto mt-4 w-full max-w-7xl px-4 md:px-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-plum">
            {cat !== 'All' ? cat : area && !showAll ? `Near you in ${area.name}` : 'All kitchens'}
          </h2>
          <div className="flex items-center gap-3">
            {showAll && area && (
              <button onClick={() => setShowAll(false)} className="text-xs font-bold text-royal underline underline-offset-2">
                Back to {area.name}
              </button>
            )}
            <Link to="/restaurants" className="text-xs font-bold text-royal underline underline-offset-2">
              See all
            </Link>
          </div>
        </div>
        {restaurantsQuery.isLoading ? (
          <LoadingBlock label="Loading kitchens near you…" />
        ) : restaurantsQuery.isError ? (
          <ErrorBlock message="Could not load restaurants." onRetry={() => restaurantsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <MapPin className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            {cat === 'All' && area && !showAll ? (
              <>
                <p className="mt-2 text-sm font-semibold text-plum">We're not in {area.name} yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {area.cityName ?? 'Your city'} is launching soon — browse live kitchens in the meantime.
                </p>
                <button onClick={() => setShowAll(true)} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
                  Browse all kitchens
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-semibold text-plum">Nothing in this category yet</p>
                <button onClick={() => setCat('All')} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
                  Show everything
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/r/${r.slug}`}
                  className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <DishArt seed={r.id} className="h-36 w-full" />
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-extrabold tracking-tight text-plum">{r.name}</h3>
                      <Mono className="shrink-0 text-muted-foreground">{r.areaName.toUpperCase()}</Mono>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                      <Mono>[{r.etaMin}–{r.etaMax} MIN]</Mono>
                      <Mono>[<Rating value={r.rating} /> · {r.reviewCount.toLocaleString()}]</Mono>
                      <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
                    </div>
                    {r.promo && (
                      <p className="mt-2 inline-block rounded-full bg-saffron-soft px-2.5 py-1 text-[11px] font-bold text-plum">{r.promo}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
