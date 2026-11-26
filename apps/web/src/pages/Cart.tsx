import { Link } from 'react-router'
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store'
import { DishArt, Mono, fmt } from '../ui'

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
    <div className="px-4 pt-20">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Cart</h1>
        <button
          onClick={() => {
            clear()
            toast.success('Cart cleared')
          }}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>
      <Mono className="mt-1 text-muted-foreground">[{(cartRestaurant?.name ?? '').toUpperCase()}]</Mono>
      <ul className="mt-4 space-y-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <DishArt seed={l.itemId} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-plum">{l.name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{fmt(l.priceKobo)} each</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-lilac px-1.5 py-1">
              <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Reduce ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span key={l.qty} className="min-w-5 animate-bump text-center font-mono text-sm font-bold text-plum">{l.qty}</span>
              <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Add one more ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="w-16 shrink-0 text-right font-mono text-sm font-bold text-plum">{fmt(l.priceKobo * l.qty)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
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
  )
}
