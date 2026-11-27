import { Link } from 'react-router'
import { AlertTriangle, Minus, PencilLine, Plus, ShoppingBag, Trash2, ArrowRight, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store'
import { cartLineUnitKobo } from '../types'
import { DishImage, PageHero, fmt } from '../ui'

export default function CartPage() {
  const { lines, subtotalKobo, deliveryFeeKobo, totalKobo, setQty, clear, cartRestaurant } = useStore()
  if (!lines.length) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <ShoppingBag className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Good food is one tap away.</p>
        <Link to="/" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Browse restaurants
        </Link>
      </div>
    )
  }
  return (
    <div className="pb-8">
      <PageHero icon={ShoppingBag} title="Cart" sub={cartRestaurant?.name ?? 'Your basket'}>
        <button
          onClick={() => {
            clear()
            toast.success('Cart cleared')
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-lilac/15 px-3.5 py-2 text-xs font-bold text-lilac transition-colors hover:bg-lilac/25 active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </PageHero>
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
      <ul className="mt-5 space-y-3 lg:mt-2">
        {lines.map((l) => {
          const unit = cartLineUnitKobo(l)
          const options = l.options ?? []
          return (
          <li key={l.key} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Link
                to={`/item/${l.itemId}?line=${encodeURIComponent(l.key)}`}
                className="flex min-w-0 flex-1 items-center gap-3"
                aria-label={`Edit ${l.name}`}
              >
                <DishImage src={l.photoUrl} seed={l.itemId} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-plum">{l.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{fmt(unit)} each</p>
                </div>
              </Link>
              <div className="flex items-center gap-1 rounded-full bg-lilac px-1.5 py-1">
                <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Reduce ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span key={l.qty} className="min-w-5 animate-bump text-center font-mono text-sm font-bold text-plum">{l.qty}</span>
                <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Add one more ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="w-16 shrink-0 text-right font-mono text-sm font-bold text-plum">{fmt(unit * l.qty)}</p>
            </div>

            {(options.length > 0 || l.note || l.allergy || l.cutlery) && (
              <div className="mt-2 space-y-1.5 border-t border-dashed border-border pt-2">
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((o) => (
                      <span key={o.optionId} className="rounded-full bg-lilac px-2.5 py-1 text-[11px] font-semibold text-plum">
                        + {o.name}{o.priceKobo > 0 ? ` · ${fmt(o.priceKobo)}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {l.cutlery && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
                    Cutlery included
                  </p>
                )}
                {l.allergy && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-saffron">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Allergy: {l.allergy}
                  </p>
                )}
                {l.note && (
                  <p className="text-[11px] italic text-muted-foreground">“{l.note}”</p>
                )}
              </div>
            )}

            <Link
              to={`/item/${l.itemId}?line=${encodeURIComponent(l.key)}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-royal underline underline-offset-2"
            >
              <PencilLine className="h-3 w-3" aria-hidden="true" />
              Edit toppings & notes
            </Link>
          </li>
          )
        })}
      </ul>
      <div className="lg:sticky lg:top-24">
      <div className="mt-5 rounded-2xl border border-border bg-card p-4 lg:mt-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotalKobo)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-muted-foreground">
          <span>Delivery</span>
          <span className="font-mono">{fmt(deliveryFeeKobo)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-plum">
          <span>Total</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </div>
      </div>
      <Link
        to="/checkout"
        className="mt-5 flex items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
      >
        Checkout · {fmt(totalKobo)}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      </div>
      </div>
      </div>
    </div>
  )
}
