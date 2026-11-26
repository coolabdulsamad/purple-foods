import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Flame, Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { DishArt, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add, count, totalKobo } = useStore()
  const [qty, setQtyLocal] = useState(1)

  // Resolve id → restaurant slug via the flat item index, then load the
  // full restaurant so Add-to-cart gets the complete DTO it needs.
  const itemsQuery = trpc.catalog.items.useQuery()
  const hit = (itemsQuery.data ?? []).find((i) => i.id === id)
  const restaurantQuery = trpc.catalog.restaurant.useQuery(
    { slug: hit?.merchantSlug ?? '' },
    { enabled: !!hit },
  )

  if (itemsQuery.isLoading || (hit && restaurantQuery.isLoading)) {
    return <div className="pt-24"><LoadingBlock label="Plating up…" /></div>
  }
  if (itemsQuery.isError || restaurantQuery.isError) {
    return <div className="pt-24"><ErrorBlock message="Could not load this dish." onRetry={() => { itemsQuery.refetch(); restaurantQuery.refetch() }} /></div>
  }
  const r = restaurantQuery.data
  const item = r?.menu.find((m) => m.id === id)
  if (!r || !item) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="font-display text-xl font-extrabold text-plum">That dish is off the menu.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Back to restaurants
        </Link>
      </div>
    )
  }

  const addToCart = () => {
    for (let i = 0; i < qty; i++) add(item, r)
    toast.success(`${qty}× ${item.name} added`, { description: `From ${r.name}` })
  }

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-2 md:items-start md:gap-10 md:px-8 md:pt-24">
        <div className="relative">
          <DishArt seed={item.id} className="h-64 w-full md:h-[420px] md:rounded-3xl" />
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="absolute left-4 top-16 rounded-full bg-card/95 p-2.5 text-plum shadow-md transition-transform duration-150 active:scale-95 md:top-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 pt-5 md:px-0 md:pt-0">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-plum">{item.name}</h1>
          <p className="mt-1 shrink-0 font-mono text-lg font-bold text-plum">{fmt(item.priceKobo)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.isPopular && <span className="rounded-full bg-lilac-deep px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-royal">Popular</span>}
          {item.isSpicy && (
            <span className="flex items-center gap-1 rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-plum">
              <Flame className="h-3 w-3 text-saffron" aria-hidden="true" /> Spicy
            </span>
          )}
          <Mono className="text-muted-foreground">[{item.category.toUpperCase()}]</Mono>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

        <Link
          to={`/r/${r.slug}`}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-lilac/60"
        >
          <DishArt seed={r.id} className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-plum">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              <Rating value={r.rating} /> · {r.etaMin}–{r.etaMax} min · {fmt(r.deliveryFeeKobo)} delivery
            </p>
          </div>
          <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
        </Link>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="pl-2 text-sm font-bold text-plum">Quantity</span>
          <div className="flex items-center gap-1 rounded-full bg-lilac px-1.5 py-1">
            <button
              onClick={() => setQtyLocal((n) => Math.max(1, n - 1))}
              aria-label="Reduce quantity"
              className="rounded-full p-2 text-plum transition-colors hover:bg-lilac-deep active:scale-95"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span key={qty} className="min-w-7 animate-bump text-center font-mono text-base font-bold text-plum">{qty}</span>
            <button
              onClick={() => setQtyLocal((n) => Math.min(20, n + 1))}
              aria-label="Increase quantity"
              className="rounded-full p-2 text-plum transition-colors hover:bg-lilac-deep active:scale-95"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          onClick={addToCart}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Add {qty} to cart · {fmt(item.priceKobo * qty)}
        </button>
        </div>
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
