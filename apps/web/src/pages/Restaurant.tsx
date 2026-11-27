import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Bike, Clock3, Flame, Heart, MapPin, Star } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import type { MenuItemDto, RestaurantDetailDto } from '../types'
import { AddButton, DishImage, ErrorBlock, LoadingBlock, MerchantLogo, Mono, fmt } from '../ui'

/** One menu item as a real card — photo on top, details + price below.
 *  The grid around it reacts: 1 col on phones, 2 on small screens, 3 on
 *  desktop, so the menu always fills the website layout properly. */
function DishCard({ item, r }: { item: MenuItemDto; r: RestaurantDetailDto }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-royal/40 hover:shadow-lg">
      <Link to={`/item/${item.id}`} state={{ slug: r.slug }} className="relative block">
        <DishImage
          src={item.photoUrl}
          seed={item.id}
          className="h-36 w-full transition-transform duration-300 group-hover:scale-[1.03] md:h-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden="true" />
        <span className="absolute left-2.5 top-2.5 flex gap-1.5">
          {item.isPopular && (
            <span className="rounded-full bg-saffron px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-plum-deep shadow">
              Popular
            </span>
          )}
          {item.isSpicy && (
            <span className="flex items-center gap-0.5 rounded-full bg-plum/85 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-saffron shadow">
              <Flame className="h-2.5 w-2.5" aria-hidden="true" />
              Spicy
            </span>
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <Link to={`/item/${item.id}`} state={{ slug: r.slug }}>
          <h3 className="text-sm font-extrabold leading-snug text-plum transition-colors group-hover:text-royal">
            {item.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-mono text-sm font-extrabold text-royal">{fmt(item.priceKobo)}</span>
          <AddButton item={item} r={r} />
        </div>
      </div>
    </article>
  )
}

export default function RestaurantPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { count, totalKobo, session } = useStore()
  const restaurantQuery = trpc.catalog.restaurant.useQuery({ slug: slug ?? '' }, { enabled: !!slug })
  const reviewsQuery = trpc.reviews.forMerchant.useQuery({ slug: slug ?? '' }, { enabled: !!slug })
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
        <Link to="/restaurants" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Browse restaurants
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
    <div className="pb-10">
      {/* ── Hero: cover + logo + actions ─────────────────────────── */}
      <div className="relative">
        <DishImage src={r.coverUrl} seed={r.id + '-hero'} className="h-52 w-full md:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-deep/70 via-black/10 to-black/20" aria-hidden="true" />
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

      {/* ── Info card: overlaps the hero, anchors the page ───────── */}
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
        <div className="relative -mt-14 rounded-3xl border border-border bg-card p-5 shadow-xl md:-mt-16 md:p-6">
          <MerchantLogo
            r={r}
            className="absolute -top-9 right-5 h-16 w-16 border-[3px] shadow-xl md:-top-10 md:h-20 md:w-20"
          />
          <div className="pr-16 md:pr-24">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-plum md:text-3xl">
                {r.name}
              </h1>
              {r.isOpen ? (
                <span className="rounded-full bg-mint-soft px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-mint">
                  Open now
                </span>
              ) : (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-destructive">
                  Closed
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
              {r.areaName}
            </p>
          </div>

          {/* Fact pills */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-lilac px-3 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-plum">
                <Star className="h-3.5 w-3.5 fill-saffron text-saffron" aria-hidden="true" />
                {r.rating.toFixed(1)}
              </p>
              <Mono className="mt-0.5 text-muted-foreground">{r.reviewCount.toLocaleString()} reviews</Mono>
            </div>
            <div className="rounded-2xl bg-lilac px-3 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-plum">
                <Clock3 className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
                {r.etaMin}–{r.etaMax}
              </p>
              <Mono className="mt-0.5 text-muted-foreground">minutes</Mono>
            </div>
            <div className="rounded-2xl bg-lilac px-3 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-plum">
                <Bike className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
                {fmt(r.deliveryFeeKobo)}
              </p>
              <Mono className="mt-0.5 text-muted-foreground">delivery</Mono>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {r.tags.map((t) => (
              <Link
                key={t}
                to={`/category/${encodeURIComponent(t)}`}
                className="rounded-full border border-royal/25 bg-lilac px-3 py-1 text-[11px] font-bold text-royal transition-colors hover:bg-royal hover:text-lilac"
              >
                {t}
              </Link>
            ))}
          </div>
          {r.promo && (
            <p className="mt-3.5 rounded-2xl bg-saffron-soft px-4 py-2.5 text-xs font-bold text-plum">
              🎉 {r.promo}
            </p>
          )}
        </div>
      </div>

      {/* ── Menu: category sections of responsive dish cards ─────── */}
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
        {groups.map((g) => (
          <section key={g.cat} className="mt-8">
            <div className="flex items-baseline gap-2 border-b-2 border-royal/15 pb-2">
              <h2 className="font-display text-base font-extrabold uppercase tracking-[0.12em] text-plum">
                {g.cat}
              </h2>
              <Mono className="text-muted-foreground">[{g.items.length} ITEM{g.items.length > 1 ? 'S' : ''}]</Mono>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((m) => (
                <DishCard key={m.id} item={m} r={r} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Reviews ──────────────────────────────────────────────── */}
      <section className="mx-auto mt-10 w-full max-w-5xl px-4 md:px-8">
        <div className="flex items-baseline gap-2 border-b-2 border-royal/15 pb-2">
          <h2 className="font-display text-base font-extrabold uppercase tracking-[0.12em] text-plum">
            Reviews
          </h2>
          {r.reviewCount > 0 && (
            <Mono className="text-muted-foreground">[{r.reviewCount.toLocaleString()}]</Mono>
          )}
        </div>
        {(reviewsQuery.data ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-royal/30 bg-lilac/50 p-5 text-center text-xs text-muted-foreground">
            No written reviews yet — be the first after your order arrives.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {(reviewsQuery.data ?? []).map((rv) => (
              <li key={rv.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-plum">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lilac font-display text-xs font-extrabold text-royal">
                      {rv.authorName.charAt(0).toUpperCase()}
                    </span>
                    {rv.authorName}
                  </p>
                  <span className="flex items-center gap-0.5" aria-label={`${rv.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= rv.rating ? 'fill-saffron text-saffron' : 'text-lilac-deep'}`}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                </div>
                {rv.comment && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{rv.comment}</p>}
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {new Date(rv.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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
