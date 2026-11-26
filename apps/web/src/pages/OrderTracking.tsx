import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, LifeBuoy, MapPin, PackageCheck, Phone, RefreshCcw } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { DishArt, ErrorBlock, LoadingBlock, Mono, fmt } from '../ui'
import { TrackingMap } from '../components/TrackingMap'
import { EtaClock, OrderStepper, STATUS_LABEL } from './order-shared'

export default function OrderTrackingPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const { session } = useStore()
  const ordersQuery = trpc.orders.mine.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
  })

  if (!session) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Sign in to track this order</h1>
        <Link to="/auth" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Sign in
        </Link>
      </div>
    )
  }

  if (ordersQuery.isLoading) return <div className="pt-24"><LoadingBlock label="Loading your order…" /></div>
  if (ordersQuery.isError) return <div className="pt-24"><ErrorBlock message="Could not load this order." onRetry={() => ordersQuery.refetch()} /></div>

  const o = (ordersQuery.data ?? []).find((x) => x.humanRef === ref)
  if (!o) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="font-display text-xl font-extrabold text-plum">Order {ref} is not on this account.</p>
        <Link to="/orders" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Back to orders
        </Link>
      </div>
    )
  }

  const live = o.status !== 'delivered' && o.status !== 'cancelled'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-20 md:pt-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full border border-border bg-card p-2.5 text-plum transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-plum">{o.humanRef}</h1>
          <Mono className="text-muted-foreground">[{o.merchantName.toUpperCase()}]</Mono>
        </div>
        {live && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-mint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Mono className="text-muted-foreground">[{STATUS_LABEL[o.status].toUpperCase()}]</Mono>
          {live && (
            <p className="text-xs text-muted-foreground">
              ETA <EtaClock placedAt={o.placedAt} />
            </p>
          )}
        </div>
        <div className="mt-4">
          <OrderStepper status={o.status} />
        </div>
        {o.status === 'cancelled' && (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            This order was cancelled. You were not charged.
          </p>
        )}
      </div>

      {(o.merchantLat != null || o.deliveryAreaLat != null) && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <TrackingMap order={o} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <Link to={`/r/${o.merchantSlug}`} className="flex items-center gap-3 border-b border-border p-4 transition-colors hover:bg-lilac/60">
          <DishArt seed={o.merchantSlug} className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-plum">{o.merchantName}</p>
            <p className="text-xs text-muted-foreground">View menu · order again</p>
          </div>
          <RefreshCcw className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
        </Link>
        <ul className="divide-y divide-border px-4">
          {o.items.map((it, idx) => (
            <li key={idx} className="py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-plum">{it.quantity}× {it.name}</span>
                <span className="font-mono text-muted-foreground">{fmt(it.lineTotalKobo)}</span>
              </div>
              {it.options.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">+ {it.options.map((op) => op.name).join(', ')}</p>
              )}
              {(it.note || it.allergy || it.cutlery) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    it.cutlery ? 'cutlery' : '',
                    it.allergy ? `allergy: ${it.allergy}` : '',
                    it.note ? `“${it.note}”` : '',
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 border-t border-border bg-lilac/50 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{fmt(o.subtotalKobo)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery</span>
            <span className="font-mono">{fmt(o.deliveryFeeKobo)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-display text-base font-extrabold text-plum">
            <span>Total</span>
            <span className="font-mono">{fmt(o.totalKobo)}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            {o.paymentMethod === 'cod' ? 'Cash on delivery' : o.paymentMethod} · {o.paymentStatus}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-plum">{o.deliveryName}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {o.deliveryStreet}, {o.deliveryAreaName}
            </p>
            {o.deliveryNotes && <p className="mt-1 text-xs italic text-muted-foreground">“{o.deliveryNotes}”</p>}
            <p className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Phone className="h-3 w-3" aria-hidden="true" />
              {o.deliveryPhone}
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/help"
        className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-plum transition-colors hover:bg-lilac"
      >
        <span className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-royal" aria-hidden="true" />
          Need help with this order?
        </span>
        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
      </Link>
    </div>
  )
}
