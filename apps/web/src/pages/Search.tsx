import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Flame, Search, Store } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { DishArt, LoadingBlock, Mono, Rating, fmt } from '../ui'

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
      .slice(0, 20)
    const restaurants = (restaurantsQuery.data ?? [])
      .filter((r) => `${r.name} ${r.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 6)
    return { items, restaurants }
  }, [needle, itemsQuery.data, restaurantsQuery.data])

  return (
    <div className="px-4 pt-20">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Search</h1>
      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm focus-within:border-royal">
        <Search className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
        <span className="sr-only">Search dishes and restaurants</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Search amala, suya, shawarma…"
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        />
      </label>

      {!needle && (
        <div className="mt-5">
          <Mono className="text-muted-foreground">[POPULAR RIGHT NOW]</Mono>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-plum transition-colors hover:bg-lilac active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {needle && (itemsQuery.isLoading || restaurantsQuery.isLoading) && <LoadingBlock label="Searching…" />}

      {needle && !itemsQuery.isLoading && (
        <>
          {results.restaurants.length > 0 && (
            <section className="mt-6">
              <Mono className="text-muted-foreground">[RESTAURANTS]</Mono>
              <ul className="mt-2 space-y-2">
                {results.restaurants.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/r/${r.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-transform duration-150 active:scale-[0.99]"
                    >
                      <DishArt seed={r.id} className="h-12 w-12 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-plum">{r.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <Rating value={r.rating} /> · {r.etaMin}–{r.etaMax} min · {r.areaName}
                        </p>
                      </div>
                      <Store className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.items.length > 0 && (
            <section className="mt-6">
              <Mono className="text-muted-foreground">[DISHES]</Mono>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
                {results.items.map((i) => (
                  <li key={i.id}>
                    <Link to={`/item/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-lilac/60">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-bold text-plum">
                          {i.name}
                          {i.isSpicy && <Flame className="h-3.5 w-3.5 shrink-0 text-saffron" aria-label="Spicy" />}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{i.merchantName}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-plum">{fmt(i.priceKobo)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.items.length === 0 && results.restaurants.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-plum">Nothing matches “{q}”</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a dish name, cuisine or restaurant.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
