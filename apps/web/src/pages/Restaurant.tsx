import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Flame, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { AddButton, DishArt, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

export default function RestaurantPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { count, totalKobo, session } = useStore()
  const restaurantQuery = trpc.catalog.restaurant.useQuery({ slug: slug ?? '' }, { enabled: !!slug })
  const favoritesQuery = trpc.favorites.ids.useQuery(undefined, { enabled: !!session })
  const utils = trpc.useUtils()
  const toggle = trpc.favorites.toggle.useMutation({
    onSuccess: (r) => {
      utils.favorites.ids.invalidate()
      utils.favorites.list.invalidate()
      toast.success(r.favorited ? 'Saved to favorites' : 'Removed from favorites')
    },
    onError: (e) => toast.error('Could not update favorites', { description: e.message }),
  })

  if (restaurantQuery.isLoading) {
    return <div className="pt-24"><LoadingBlock label="Opening the kitchen…" /></div>
  }
  if (restaurantQuery.isError) {
    return <div className="pt-24"><ErrorBlock message="Could not load this restaurant." onRetry={() => restaurantQuery.refetch()} /></div>
  }
  const r = restaurantQuery.data
  if (!r) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="font-display text-xl font-extrabold text-plum">That kitchen closed its page.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Back to restaurants
        </Link>
      </div>
    )
  }
  const groups: { cat: string; items: typeof r.menu }[] = []
  for (const item of r.menu) {
    const g = groups.find((x) => x.cat === item.category)
    if (g) g.items.push(item)
    else groups.push({ cat: item.category, items: [item] })
  }
  const isFavorite = (favoritesQuery.data ?? []).includes(r.id)

  const onHeart = () => {
    if (!session) {
      toast.info('Sign in to save favorites', { description: 'Takes ten seconds — email, Google or phone.' })
      navigate('/auth')
      return
    }
    toggle.mutate({ merchantId: r.id })
  }

  return (
    <div className="pb-8">
      <div className="relative">
        <DishArt seed={r.id + '-hero'} className="h-44 w-full md:h-72" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute left-4 top-16 rounded-full bg-card/95 p-2.5 text-plum shadow-md transition-transform duration-150 active:scale-95 md:left-8 md:top-20"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={onHeart}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={isFavorite}
          disabled={toggle.isPending}
          className="absolute right-4 top-16 rounded-full bg-card/95 p-2.5 shadow-md transition-transform duration-150 active:scale-95 disabled:opacity-60 md:right-8 md:top-20"
        >
          <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-destructive text-destructive' : 'text-plum'}`} aria-hidden="true" />
        </button>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-plum md:text-4xl">{r.name}</h1>
          <Mono className="mt-1.5 shrink-0 text-muted-foreground">{r.areaName.toUpperCase()}</Mono>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-muted-foreground">
          <Mono>[{r.etaMin}–{r.etaMax} MIN]</Mono>
          <Mono>[<Rating value={r.rating} /> · {r.reviewCount.toLocaleString()} REVIEWS]</Mono>
          <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
          {!r.isOpen && <Mono className="text-destructive">[CLOSED NOW]</Mono>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <Link
              key={t}
              to={`/category/${encodeURIComponent(t)}`}
              className="rounded-full bg-lilac px-2.5 py-1 text-[11px] font-bold text-royal transition-colors hover:bg-lilac-deep"
            >
              {t}
            </Link>
          ))}
        </div>
        {r.promo && (
          <p className="mt-3 rounded-xl bg-saffron-soft px-3 py-2 text-xs font-bold text-plum">{r.promo}</p>
        )}
      </div>
      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-2 md:gap-x-10 md:px-8">
        {groups.map((g) => (
          <section key={g.cat} className="mt-6 px-4 md:px-0">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.14em] text-royal">{g.cat}</h2>
            <ul className="mt-1 divide-y divide-border">
              {g.items.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3.5">
                  <Link to={`/item/${m.id}`} state={{ slug: r.slug }} className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-plum">
                      {m.name}
                      {m.isPopular && <span className="rounded-full bg-lilac-deep px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-royal">Popular</span>}
                      {m.isSpicy && <Flame className="h-3.5 w-3.5 text-saffron" aria-label="Spicy" />}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
                  </Link>
                  <AddButton item={m} r={r} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {count > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-[72px] left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 items-center justify-between rounded-full bg-plum px-5 py-3.5 text-sm font-bold text-lilac shadow-xl transition-transform duration-150 active:scale-[0.98] md:bottom-8 md:left-auto md:right-8 md:w-auto md:min-w-[320px] md:translate-x-0"
        >
          <span>View cart · {count} item{count > 1 ? 's' : ''}</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </Link>
      )}
    </div>
  )
}
