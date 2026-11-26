import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowDownWideNarrow, ArrowLeft, Heart, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { DishArt, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

type SortKey = 'recent' | 'rating' | 'eta' | 'fee'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently saved' },
  { key: 'rating', label: 'Top rated' },
  { key: 'eta', label: 'Fastest' },
  { key: 'fee', label: 'Lowest delivery' },
]

export default function FavoritesPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const favoritesQuery = trpc.favorites.list.useQuery(undefined, { enabled: !!session })
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')

  const toggle = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      utils.favorites.list.invalidate()
      utils.favorites.ids.invalidate()
    },
    onError: (e) => toast.error('Could not update favorites', { description: e.message }),
  })

  const all = useMemo(() => favoritesQuery.data ?? [], [favoritesQuery.data])
  const allTags = useMemo(() => {
    const t = new Set<string>()
    for (const r of all) for (const x of r.tags ?? []) t.add(x)
    return [...t].sort()
  }, [all])

  const list = useMemo(() => {
    let out = all
    const q = query.trim().toLowerCase()
    if (q) out = out.filter((r) => r.name.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q)))
    if (tag) out = out.filter((r) => (r.tags ?? []).includes(tag))
    if (openOnly) out = out.filter((r) => r.isOpen)
    const sorted = [...out]
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    else if (sort === 'eta') sorted.sort((a, b) => a.etaMin - b.etaMin)
    else if (sort === 'fee') sorted.sort((a, b) => a.deliveryFeeKobo - b.deliveryFeeKobo)
    return sorted
  }, [all, query, tag, openOnly, sort])

  const filtering = !!query.trim() || !!tag || openOnly

  if (!session) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <Heart className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Sign in to keep favorites</h1>
        <p className="mt-1 max-w-[30ch] text-sm text-muted-foreground">
          Save the kitchens you love and get back to them in one tap.
        </p>
        <button onClick={() => navigate('/auth')} className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-20 md:px-8 md:pt-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full border border-border bg-card p-2.5 text-plum transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Favorites</h1>
          <Mono className="text-muted-foreground">[{all.length} SAVED]</Mono>
        </div>
      </div>

      {favoritesQuery.isLoading ? (
        <LoadingBlock label="Loading your favorites…" />
      ) : favoritesQuery.isError ? (
        <ErrorBlock message="Could not load favorites." onRetry={() => favoritesQuery.refetch()} />
      ) : all.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Heart className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">No favorites yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap the heart on any restaurant to save it here.</p>
          <Link to="/restaurants" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-xs font-bold text-lilac active:scale-95">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your favorites…"
              aria-label="Search favorites"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setOpenOnly(!openOnly)}
              aria-pressed={openOnly}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                openOnly ? 'bg-mint text-plum-deep' : 'border border-border bg-card text-plum hover:bg-lilac'
              }`}
            >
              Open now
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                aria-pressed={tag === t}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold capitalize transition-colors ${
                  tag === t ? 'bg-plum text-lilac' : 'border border-border bg-card text-plum hover:bg-lilac'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Sort favorites">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={sort === s.key}
                  onClick={() => setSort(s.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    sort === s.key ? 'bg-royal text-lilac' : 'bg-lilac text-royal hover:bg-lilac-deep/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold text-plum">Nothing matches those filters</p>
              <button
                onClick={() => { setQuery(''); setTag(null); setOpenOnly(false) }}
                className="mt-3 rounded-full bg-plum px-5 py-2.5 text-xs font-bold text-lilac active:scale-95"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <li key={r.id} className="relative">
                  <Link
                    to={`/r/${r.slug}`}
                    className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <div className="relative">
                      <DishArt seed={r.id} className="h-32 w-full" />
                      {!r.isOpen && (
                        <span className="absolute left-3 top-3 rounded-full bg-plum-deep/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-lilac">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-extrabold tracking-tight text-plum">{r.name}</h3>
                        <Mono className="shrink-0 text-muted-foreground">{r.areaName.toUpperCase()}</Mono>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                        <Mono>[{r.etaMin}–{r.etaMax} MIN]</Mono>
                        <Mono>[<Rating value={r.rating} />]</Mono>
                        <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggle.mutate({ merchantId: r.id })}
                    aria-label={`Remove ${r.name} from favorites`}
                    disabled={toggle.isPending}
                    className="absolute right-3 top-3 rounded-full bg-card/95 p-2.5 shadow-md transition-transform duration-150 active:scale-95 disabled:opacity-60"
                  >
                    <Heart className="h-4 w-4 fill-destructive text-destructive" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtering && list.length > 0 && (
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {list.length} of {all.length} favorites
            </p>
          )}
        </>
      )}
    </div>
  )
}
