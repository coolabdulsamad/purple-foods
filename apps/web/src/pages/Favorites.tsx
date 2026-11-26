import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { DishArt, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

export default function FavoritesPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const favoritesQuery = trpc.favorites.list.useQuery(undefined, { enabled: !!session })
  const toggle = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      utils.favorites.list.invalidate()
      utils.favorites.ids.invalidate()
    },
    onError: (e) => toast.error('Could not update favorites', { description: e.message }),
  })

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
    <div className="px-4 pt-20">
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
          <Mono className="text-muted-foreground">[{(favoritesQuery.data ?? []).length} SAVED]</Mono>
        </div>
      </div>

      {favoritesQuery.isLoading ? (
        <LoadingBlock label="Loading your favorites…" />
      ) : favoritesQuery.isError ? (
        <ErrorBlock message="Could not load favorites." onRetry={() => favoritesQuery.refetch()} />
      ) : (favoritesQuery.data ?? []).length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Heart className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">No favorites yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap the heart on any restaurant to save it here.</p>
          <Link to="/restaurants" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-xs font-bold text-lilac active:scale-95">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {(favoritesQuery.data ?? []).map((r) => (
            <li key={r.id} className="relative">
              <Link
                to={`/r/${r.slug}`}
                className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <DishArt seed={r.id} className="h-32 w-full" />
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
    </div>
  )
}
