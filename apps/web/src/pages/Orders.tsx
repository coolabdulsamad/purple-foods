import { Link } from 'react-router'
import { Bike, ChevronRight, PackageCheck } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { ErrorBlock, LoadingBlock, PageHero, fmt } from '../ui'
import { EtaClock, STATUS_LABEL } from './order-shared'

const STATUS_STYLE: Record<string, string> = {
  received: 'bg-saffron-soft text-plum/80',
  preparing: 'bg-lilac-deep text-royal',
  on_the_way: 'bg-royal/10 text-royal',
  delivered: 'bg-mint-soft text-mint',
  cancelled: 'bg-destructive/10 text-destructive',
}

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
  const live = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <div className="pb-8">
      <PageHero
        icon={PackageCheck}
        title="Orders"
        sub={live ? `${live} live · auto-refresh 15s` : 'Your order history'}
      />
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
        {ordersQuery.isLoading ? (
          <LoadingBlock label="Fetching your orders…" />
        ) : ordersQuery.isError ? (
          <ErrorBlock message="Could not load your orders." onRetry={() => ordersQuery.refetch()} />
        ) : orders.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-royal/30 bg-lilac/40 p-10 text-center">
            <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
            <h2 className="mt-4 font-display text-xl font-extrabold text-plum">No orders yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your history lands here after the first checkout.</p>
            <Link to="/restaurants" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
              Order something hot
            </Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {orders.map((o) => {
              const liveOrder = o.status !== 'delivered' && o.status !== 'cancelled'
              return (
                <li key={o.id}>
                  <Link
                    to={`/orders/${o.humanRef}`}
                    className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-royal/40 hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-bold text-royal">{o.humanRef}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${STATUS_STYLE[o.status] ?? 'bg-lilac text-plum'}`}
                          >
                            {STATUS_LABEL[o.status]}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-bold text-plum">{o.merchantName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.length !== 1 ? 's' : ''} ·{' '}
                          {new Date(o.placedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-plum">{fmt(o.totalKobo)}</p>
                          {liveOrder && (
                            <p className="mt-0.5 flex items-center justify-end gap-1 text-muted-foreground">
                              <Bike className="h-3 w-3 text-royal" aria-hidden="true" />
                              <EtaClock placedAt={o.placedAt} />
                            </p>
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
    </div>
  )
}
