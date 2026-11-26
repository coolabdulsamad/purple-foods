import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Store } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { DishArt, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

export default function CategoryPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const tag = decodeURIComponent(name ?? '')
  const restaurantsQuery = trpc.catalog.restaurants.useQuery()
  const matches = (restaurantsQuery.data ?? []).filter((r) => r.tags.includes(tag))

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
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">{tag}</h1>
          <Mono className="text-muted-foreground">[{matches.length} SPOTS]</Mono>
        </div>
      </div>

      {restaurantsQuery.isLoading ? (
        <LoadingBlock label="Loading…" />
      ) : restaurantsQuery.isError ? (
        <ErrorBlock message="Could not load this category." onRetry={() => restaurantsQuery.refetch()} />
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">No {tag} spots yet</p>
          <Link to="/restaurants" className="mt-3 inline-block rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
            Browse all restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((r) => (
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
                    <Mono>[<Rating value={r.rating} />]</Mono>
                    <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
