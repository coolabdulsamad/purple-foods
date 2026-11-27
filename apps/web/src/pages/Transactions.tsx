import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BadgeCheck, Clock3, Loader2, LogIn, ReceiptText, XCircle } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { PageHero, fmt } from '../ui'

type StatusFilter = 'all' | 'success' | 'pending' | 'failed'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
]

function StatusPill({ status }: { status: string }) {
  if (status === 'success')
    return (
      <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5 text-[10px] font-bold text-mint">
        <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Paid
      </span>
    )
  if (status === 'pending')
    return (
      <span className="flex items-center gap-1 rounded-full bg-saffron/20 px-2 py-0.5 text-[10px] font-bold text-plum">
        <Clock3 className="h-3 w-3" aria-hidden="true" /> Pending
      </span>
    )
  return (
    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
      <XCircle className="h-3 w-3" aria-hidden="true" /> {status === 'abandoned' ? 'Abandoned' : 'Failed'}
    </span>
  )
}

export default function TransactionsPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const txQuery = trpc.payments.transactions.useQuery(undefined, { enabled: !!session })

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-24 text-center">
        <LogIn className="mx-auto h-8 w-8 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-extrabold text-plum">Sign in to see transactions</h1>
        <button onClick={() => navigate('/auth?next=/account/transactions')} className="mt-4 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac">
          Sign in
        </button>
      </div>
    )
  }

  const all = txQuery.data ?? []
  const list = filter === 'all' ? all : all.filter((t) => t.status === filter)
  const paidTotal = all.filter((t) => t.status === 'success').reduce((n, t) => n + t.amountKobo, 0)

  return (
    <div className="pb-8">
      <PageHero icon={ReceiptText} title="Transactions" sub="Your payment history" />
      <div className="mx-auto w-full max-w-2xl px-4 md:px-8">
      {all.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-plum-deep p-4 text-lilac">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-saffron">Total paid online</p>
            <p className="mt-1 font-display text-xl font-extrabold">{fmt(paidTotal)}</p>
          </div>
          <p className="font-mono text-xs text-lilac/70">{all.length} transaction{all.length === 1 ? '' : 's'}</p>
        </div>
      )}

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter transactions">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              filter === f.key ? 'bg-plum text-lilac' : 'border border-border bg-card text-plum hover:bg-lilac'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {txQuery.isLoading ? (
        <div className="flex justify-center pt-16">
          <Loader2 className="h-6 w-6 animate-spin text-royal" aria-hidden="true" />
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <ReceiptText className="mx-auto h-9 w-9 text-lilac-deep" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-extrabold text-plum">
            {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
          </h2>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Every online payment you make on Purple Foods shows up here with its reference and status.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {list.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-plum">{t.merchantName ?? 'Purple Foods'}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{t.reference}</p>
                </div>
                <p className="shrink-0 font-mono text-sm font-extrabold text-plum">{fmt(t.amountKobo)}</p>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusPill status={t.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {t.channel === 'card' && t.cardLast4 ? `${t.cardBrand} ···· ${t.cardLast4}` : t.channel}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(t.paidAt ?? t.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              {t.orderRef && (
                <Link
                  to={`/orders/${t.orderRef}`}
                  className="mt-2.5 flex items-center justify-between rounded-xl bg-lilac px-3.5 py-2.5 text-xs font-bold text-royal transition-colors hover:bg-lilac-deep/40"
                >
                  View order {t.orderRef}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
