import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Store } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { ErrorBlock, LoadingBlock, MerchantCard, Mono } from '../ui'

type Sort = 'rating' | 'eta' | 'fee'

export default function RestaurantsPage() {
  const { area } = useStore()
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState<Sort>('rating')
  const restaurantsQuery = trpc.catalog.restaurants.useQuery({ areaId: area?.id })

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of restaurantsQuery.data ?? []) r.tags.forEach((t) => set.add(t))
    return ['All', ...Array.from(set).sort()]
  }, [restaurantsQuery.data])

  const filtered = useMemo(() => {
    const list = (restaurantsQuery.data ?? []).filter((r) => cat === 'All' || r.tags.includes(cat))
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      rating: (a, b) => b.rating - a.rating,
      eta: (a, b) => a.etaMin - b.etaMin,
      fee: (a, b) => a.deliveryFeeKobo - b.deliveryFeeKobo,
    }
    return [...list].sort(by[sort])
  }, [restaurantsQuery.data, cat, sort])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-20 md:px-8 md:pt-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum md:text-3xl">All restaurants</h1>
      <Mono className="mt-1 text-muted-foreground">
        [{filtered.length} SPOTS · {area ? `${area.name.toUpperCase()}${area.cityName ? `, ${area.cityName.toUpperCase()}` : ''}` : 'ALL CITIES'}]
      </Mono>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Cuisine categories">
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

      <div className="mt-3 flex items-center gap-2">
        <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        {(
          [
            { id: 'rating', label: 'Top rated' },
            { id: 'eta', label: 'Fastest' },
            { id: 'fee', label: 'Lowest fee' },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            aria-pressed={sort === s.id}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
              sort === s.id ? 'bg-royal text-lilac' : 'bg-lilac text-plum hover:bg-lilac-deep'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {restaurantsQuery.isLoading ? (
        <LoadingBlock label="Loading restaurants…" />
      ) : restaurantsQuery.isError ? (
        <ErrorBlock message="Could not load restaurants." onRetry={() => restaurantsQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">Nothing in this category yet</p>
          <button onClick={() => setCat('All')} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
            Show everything
          </button>
        </div>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <MerchantCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
