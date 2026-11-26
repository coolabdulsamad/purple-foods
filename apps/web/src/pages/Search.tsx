import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Flame, Search, SearchX, Sparkles, TrendingUp } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { DishImage, ErrorBlock, Grain, LoadingBlock, MerchantCard, Mono, fmt } from '../ui'

const SUGGESTIONS = ['Suya', 'Amala', 'Shawarma', 'Jollof', 'Chapman', 'Burger', 'Pepper soup']

export default function SearchPage() {
  const [q, setQ] = useState('')
  const itemsQuery = trpc.catalog.items.useQuery()
  const restaurantsQuery = trpc.catalog.restaurants.useQuery()

  const needle = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (!needle) return { items: [], restaurants: [] }
    const items = (itemsQuery.data ?? [])
      .filter((i) => `${i.name} ${i.description} ${i.category} ${i.merchantName}`.toLowerCase().includes(needle))
      .slice(0, 18)
    const restaurants = (restaurantsQuery.data ?? [])
      .filter((r) => `${r.name} ${r.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 6)
    return { items, restaurants }
  }, [needle, itemsQuery.data, restaurantsQuery.data])

  // No-query discovery: popular dishes with photos, then every restaurant.
  const popular = useMemo(() => {
    const all = itemsQuery.data ?? []
    const hits = all.filter((i) => i.isPopular)
    return (hits.length >= 6 ? hits : all).slice(0, 8)
  }, [itemsQuery.data])

  return (
    <div className="pb-10">
      {/* ── Hero band: plum gradient, big field, suggestion chips ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-plum via-plum to-royal pt-24 md:pt-28">
        <Grain />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-saffron/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-royal/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 md:px-8 md:pb-12">
          <Mono className="text-saffron">[FIND YOUR CRAVING]</Mono>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-lilac md:text-4xl">
            What are you craving?
          </h1>
          <p className="mt-1.5 text-sm text-lilac/70">
            Search {itemsQuery.data?.length ?? ''} dishes across Abuja's best kitchens.
          </p>

          <label className="mt-5 flex items-center gap-3 rounded-full bg-white px-5 py-4 shadow-xl ring-royal/60 transition-shadow focus-within:ring-4 md:max-w-2xl">
            <Search className="h-5 w-5 shrink-0 text-royal" aria-hidden="true" />
            <span className="sr-only">Search dishes and restaurants</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search amala, suya, shawarma…"
              className="w-full bg-transparent text-base font-semibold text-plum outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="shrink-0 rounded-full bg-lilac px-3 py-1 text-xs font-bold text-plum transition-colors hover:bg-lilac-deep"
              >
                Clear
              </button>
            )}
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-lilac/60">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Popular right now
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  needle === s.toLowerCase()
                    ? 'border-saffron bg-saffron text-plum'
                    : 'border-white/25 bg-white/10 text-lilac hover:bg-white/20'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        {(itemsQuery.isLoading || restaurantsQuery.isLoading) && needle && (
          <LoadingBlock label="Searching…" />
        )}

        {(itemsQuery.isError || restaurantsQuery.isError) && !itemsQuery.isLoading && !restaurantsQuery.isLoading && (
          <ErrorBlock
            message="Search is unavailable right now"
            onRetry={() => {
              itemsQuery.refetch()
              restaurantsQuery.refetch()
            }}
          />
        )}

        {/* ── No query: discovery view ── */}
        {!needle && !itemsQuery.isLoading && !itemsQuery.isError && (
          <>
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-saffron" aria-hidden="true" />
                <h2 className="font-display text-lg font-extrabold tracking-tight text-plum">Popular dishes</h2>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {popular.map((i) => (
                  <li key={i.id}>
                    <DishCard item={i} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-plum">All restaurants</h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(restaurantsQuery.data ?? []).map((r) => (
                  <li key={r.id}>
                    <MerchantCard r={r} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* ── Query: results ── */}
        {needle && !itemsQuery.isLoading && !itemsQuery.isError && (
          <>
            <p className="mt-6 text-sm font-semibold text-muted-foreground">
              {results.items.length + results.restaurants.length} result
              {results.items.length + results.restaurants.length === 1 ? '' : 's'} for{' '}
              <span className="text-plum">“{q.trim()}”</span>
            </p>

            {results.restaurants.length > 0 && (
              <section className="mt-5">
                <Mono className="text-muted-foreground">[RESTAURANTS]</Mono>
                <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {results.restaurants.map((r) => (
                    <li key={r.id}>
                      <MerchantCard r={r} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.items.length > 0 && (
              <section className="mt-8">
                <Mono className="text-muted-foreground">[DISHES]</Mono>
                <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {results.items.map((i) => (
                    <li key={i.id}>
                      <DishCard item={i} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.items.length === 0 && results.restaurants.length === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
                  <SearchX className="h-6 w-6 text-royal" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-lg font-extrabold text-plum">Nothing matches “{q.trim()}”</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a dish name, a cuisine or a restaurant — or tap a popular search above.
                </p>
                <button
                  onClick={() => setQ('')}
                  className="mt-4 rounded-full bg-plum px-5 py-2.5 text-xs font-bold text-lilac transition-transform active:scale-95"
                >
                  Browse popular dishes
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type SearchItem = {
  id: string
  name: string
  category: string
  priceKobo: number
  isSpicy: boolean
  photoUrl: string | null
  merchantSlug: string
  merchantName: string
}

/** Photo-first dish card used across the search page grids. */
function DishCard({ item: i }: { item: SearchItem }) {
  return (
    <Link
      to={`/item/${i.id}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]"
    >
      <div className="relative h-32 w-full overflow-hidden sm:h-36">
        <DishImage
          src={i.photoUrl}
          seed={i.id}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden="true" />
        {i.isSpicy && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
            <Flame className="h-3 w-3" aria-hidden="true" /> Spicy
          </span>
        )}
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[11px] font-extrabold text-plum shadow">
          {fmt(i.priceKobo)}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-extrabold text-plum">{i.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.merchantName}</p>
      </div>
    </Link>
  )
}
