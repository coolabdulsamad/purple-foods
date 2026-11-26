import { useNavigate } from 'react-router'
import { ArrowLeft, BadgeCheck, CreditCard, Loader2, LogIn, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Mono } from '../ui'

export default function PaymentsPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const cardsQuery = trpc.payments.cards.useQuery(undefined, { enabled: !!session })
  const gatewayQuery = trpc.payments.config.useQuery(undefined, { enabled: !!session })

  const removeCard = trpc.payments.removeCard.useMutation({
    onSuccess: () => {
      toast.success('Card removed')
      utils.payments.cards.invalidate()
    },
    onError: (err) => toast.error('Could not remove card', { description: err.message }),
  })
  const setDefault = trpc.payments.setDefaultCard.useMutation({
    onSuccess: () => {
      toast.success('Default card updated')
      utils.payments.cards.invalidate()
    },
    onError: (err) => toast.error('Could not update default', { description: err.message }),
  })

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-24 text-center">
        <LogIn className="mx-auto h-8 w-8 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-extrabold text-plum">Sign in to see your cards</h1>
        <button onClick={() => navigate('/auth?next=/account/payments')} className="mt-4 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac">
          Sign in
        </button>
      </div>
    )
  }

  const cards = cardsQuery.data ?? []
  const paystackEnabled = gatewayQuery.data?.paystackEnabled ?? false

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-20 md:pt-24">
      <button onClick={() => navigate('/account')} className="flex items-center gap-1.5 text-xs font-bold text-royal">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Account
      </button>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-plum">Payment cards</h1>
      <Mono className="mt-1 text-muted-foreground">[YOUR CARD BOOK]</Mono>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-mint bg-mint-soft p-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-plum">
          Cards are tokenized by Paystack — Purple Foods stores only the last 4 digits and card type. New cards are added automatically the first time you pay by card at checkout.
        </p>
      </div>

      {cardsQuery.isLoading ? (
        <div className="flex justify-center pt-16">
          <Loader2 className="h-6 w-6 animate-spin text-royal" aria-hidden="true" />
        </div>
      ) : cards.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <CreditCard className="mx-auto h-9 w-9 text-lilac-deep" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-extrabold text-plum">No saved cards yet</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
            {paystackEnabled
              ? 'Pay with a card at checkout once — it will be saved here for one-tap payment next time.'
              : 'Card payments are being connected. Once live, cards you use at checkout will be saved here.'}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {cards.map((c) => (
            <li key={c.id} className="relative overflow-hidden rounded-3xl bg-plum-deep p-5 text-lilac shadow-md">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-royal/30" aria-hidden="true" />
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-saffron">{c.brand}</span>
                {c.isDefault && (
                  <span className="flex items-center gap-1 rounded-full bg-saffron px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-plum-deep">
                    <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Default
                  </span>
                )}
              </div>
              <p className="mt-5 font-mono text-lg font-bold tracking-[0.18em]">···· ···· ···· {c.last4}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-lilac/60">Bank</p>
                  <p className="text-xs font-bold">{c.bank || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-lilac/60">Expires</p>
                  <p className="font-mono text-xs font-bold">{c.expMonth}/{c.expYear}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-lilac/15 pt-3">
                {!c.isDefault && (
                  <button
                    onClick={() => setDefault.mutate({ id: c.id })}
                    disabled={setDefault.isPending}
                    className="rounded-full bg-lilac/15 px-3.5 py-1.5 text-xs font-bold text-lilac transition-colors hover:bg-lilac/25 disabled:opacity-50"
                  >
                    Make default
                  </button>
                )}
                <button
                  onClick={() => removeCard.mutate({ id: c.id })}
                  disabled={removeCard.isPending}
                  className="flex items-center gap-1 rounded-full bg-lilac/15 px-3.5 py-1.5 text-xs font-bold text-saffron transition-colors hover:bg-lilac/25 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        To add a card, place an order and choose “Card via Paystack” at checkout.
      </p>
    </div>
  )
}
