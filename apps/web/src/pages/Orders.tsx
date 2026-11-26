import { Link } from 'react-router'
import { ChevronRight, PackageCheck } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { ErrorBlock, LoadingBlock, Mono, fmt } from '../ui'
import { EtaClock, STATUS_LABEL } from './order-shared'

export default function OrdersPage() {
  const { session } = useStore()
  const ordersQuery = trpc.orders.mine.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
  })

  if (!session) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Sign in to see your orders</h1>
        <p className="mt-1 max-w-[30ch] text-sm text-muted-foreground">
          Your orders live on your account — sign in with email, Google or your phone number.
        </p>
        <Link to="/auth" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Sign in
        </Link>
      </div>
    )
  }

  const orders = ordersQuery.data ?? []

  return (
    <div className="px-4 pt-20">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Orders</h1>
      <Mono className="mt-1 text-muted-foreground">[LIVE FROM PURPLE FOODS DB · AUTO-REFRESH 15S]</Mono>
      {ordersQuery.isLoading ? (
        <LoadingBlock label="Fetching your orders…" />
      ) : ordersQuery.isError ? (
        <ErrorBlock message="Could not load your orders." onRetry={() => ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center pt-24 text-center">
          <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-extrabold text-plum">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your history lands here after the first checkout.</p>
          <Link to="/" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
            Order something hot
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => {
            const cancelled = o.status === 'cancelled'
            return (
              <li key={o.id}>
                <Link
                  to={`/orders/${o.humanRef}`}
                  className="block rounded-2xl border border-border bg-card p-4 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-royal">{o.humanRef}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-plum">{o.merchantName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.length !== 1 ? 's' : ''} ·{' '}
                        <span className={cancelled ? 'font-semibold text-destructive' : ''}>{STATUS_LABEL[o.status]}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-plum">{fmt(o.totalKobo)}</p>
                        {!cancelled && o.status !== 'delivered' && (
                          <p className="mt-0.5 text-muted-foreground"><EtaClock placedAt={o.placedAt} /></p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
