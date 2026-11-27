import { Building2, CheckCheck, Clock3, Copy, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { Mono, fmt } from '../ui'

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy', { description: value })
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`block truncate text-sm font-bold text-plum ${mono ? 'font-mono tracking-wide' : ''}`}>
          {value}
        </span>
      </span>
      <button
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="flex shrink-0 items-center gap-1 rounded-full bg-lilac px-2.5 py-1.5 text-[10px] font-bold text-royal transition-transform active:scale-95"
      >
        <Copy className="h-3 w-3" aria-hidden="true" />
        Copy
      </button>
    </div>
  )
}

/** Bank-transfer instruction card on the tracking page: account details,
 *  copy buttons, expiry countdown and the "I've sent it" confirmation. */
export function BankTransferCard({ orderId }: { orderId: string }) {
  const utils = trpc.useUtils()
  const transferQuery = trpc.payments.bankTransfer.useQuery({ orderId })
  const markSent = trpc.payments.markTransferSent.useMutation({
    onSuccess: () => {
      toast.success('Transfer marked as sent', {
        description: 'We will confirm it and fire your order to the kitchen shortly.',
      })
      utils.payments.bankTransfer.invalidate({ orderId })
      utils.orders.mine.invalidate()
    },
    onError: (e) => toast.error('Could not update the transfer', { description: e.message }),
  })

  if (transferQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-royal" aria-hidden="true" />
        Loading transfer details…
      </div>
    )
  }
  const t = transferQuery.data
  if (!t) return null

  const statusPill =
    t.status === 'paid' ? (
      <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-mint">
        <CheckCheck className="h-3 w-3" aria-hidden="true" /> Paid
      </span>
    ) : t.status === 'sent' ? (
      <span className="flex items-center gap-1 rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-plum/80">
        <Send className="h-3 w-3" aria-hidden="true" /> Confirming
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-plum/80">
        <Clock3 className="h-3 w-3" aria-hidden="true" /> Awaiting transfer
      </span>
    )

  return (
    <div className="overflow-hidden rounded-2xl border border-royal/30 bg-card shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-plum-deep via-plum to-royal px-4 py-3 text-lilac">
        <span className="flex items-center gap-2 text-sm font-extrabold">
          <Building2 className="h-4 w-4 text-saffron" aria-hidden="true" />
          Bank transfer
        </span>
        {statusPill}
      </div>
      <div className="space-y-2 p-4">
        {t.status === 'paid' ? (
          <p className="flex items-center gap-2 rounded-xl bg-mint-soft px-3.5 py-3 text-xs font-bold text-plum">
            <CheckCheck className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            Payment confirmed — the kitchen has your ticket. Sit tight!
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Transfer exactly <strong className="text-plum">{fmt(t.amountKobo)}</strong> to the
              account below{t.bankName ? '' : ' (account details load once configured)'} and use
              the reference as your narration{t.provider === 'paystack' ? ' — this account is reserved for your order only' : ''}.
            </p>
            <CopyRow label="Amount" value={fmt(t.amountKobo)} mono={false} />
            {t.bankName && <CopyRow label="Bank" value={t.bankName} mono={false} />}
            {t.accountNumber && <CopyRow label="Account number" value={t.accountNumber} />}
            {t.accountName && <CopyRow label="Account name" value={t.accountName} mono={false} />}
            <CopyRow label="Transfer reference" value={t.reference} />
            {t.expiresAt && t.status === 'pending' && (
              <Mono className="block text-center text-muted-foreground">
                [ACCOUNT RESERVED UNTIL{' '}
                {new Date(t.expiresAt)
                  .toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  .toUpperCase()}
                ]
              </Mono>
            )}
            {t.status === 'pending' ? (
              <button
                onClick={() => markSent.mutate({ orderId })}
                disabled={markSent.isPending}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3.5 text-sm font-extrabold text-plum-deep transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
              >
                {markSent.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                I've sent the transfer
              </button>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-saffron-soft px-3.5 py-3 text-xs font-bold text-plum">
                <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                Transfer marked as sent — we confirm it within minutes and your
                order heads to the kitchen.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
