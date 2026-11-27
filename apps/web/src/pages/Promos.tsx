import { useNavigate } from 'react-router'
import { BadgePercent, Copy, Loader2, Truck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Grain, Mono, PageHero, fmt } from '../ui'
import type { PromoCodeDto } from '../types'

function promoTitle(p: PromoCodeDto): string {
  if (p.kind === 'percent') return `${p.percentOff}% off your order`
  if (p.kind === 'fixed') return `${fmt(p.valueKobo ?? 0)} off your order`
  return 'Free delivery'
}

function promoBody(p: PromoCodeDto): string {
  const min = p.minOrderKobo > 0 ? ` on orders of ${fmt(p.minOrderKobo)} or more` : ''
  if (p.kind === 'free_delivery') return `Enter the code at checkout and we waive the delivery fee${min}.`
  return `Enter the code at checkout to save${min}.`
}

const KIND_TAG: Record<PromoCodeDto['kind'], string> = {
  percent: 'PERCENT OFF',
  fixed: 'MONEY OFF',
  free_delivery: 'FREE DELIVERY',
}

export default function PromosPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const promosQuery = trpc.promos.list.useQuery()
  const referralQuery = trpc.promos.myReferral.useQuery(undefined, { enabled: !!session })

  const copy = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`${label} copied`, { description: code })
    } catch {
      toast.info(`Your code: ${code}`)
    }
  }

  const referral = referralQuery.data

  return (
    <div className="pb-8">
      <PageHero icon={BadgePercent} title="Promos & referrals" sub="Live offers" />
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
      {promosQuery.isLoading ? (
        <div className="flex justify-center pt-16">
          <Loader2 className="h-6 w-6 animate-spin text-royal" aria-hidden="true" />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(promosQuery.data ?? []).map((p) => (
            <article key={p.code} className="relative overflow-hidden rounded-2xl bg-plum-deep p-4 text-lilac">
              <Grain />
              <div className="flex items-center gap-2">
                {p.kind === 'free_delivery' ? (
                  <Truck className="h-3.5 w-3.5 text-saffron" aria-hidden="true" />
                ) : (
                  <BadgePercent className="h-3.5 w-3.5 text-saffron" aria-hidden="true" />
                )}
                <Mono className="text-saffron">[{KIND_TAG[p.kind]}]</Mono>
              </div>
              <h2 className="mt-2 font-display text-lg font-extrabold leading-tight">{promoTitle(p)}</h2>
              <p className="mt-1 text-xs leading-relaxed text-lilac/80">{promoBody(p)}</p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-plum px-4 py-3">
                <span className="font-mono text-sm font-bold tracking-widest text-saffron">{p.code}</span>
                <button
                  onClick={() => copy(p.code, 'Promo code')}
                  aria-label={`Copy promo code ${p.code}`}
                  className="flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-xs font-extrabold text-plum-deep active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </button>
              </div>
            </article>
          ))}

          <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
              <Mono className="text-royal">[REFERRAL]</Mono>
            </div>
            <h2 className="mt-2 font-display text-lg font-extrabold leading-tight text-plum">Invite friends, eat free</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {referral
                ? `Your code gives friends ${fmt(referral.friendDiscountKobo)} off their first order. You earn a reward the moment their food arrives.`
                : 'Sign in to get your personal referral code — friends save on their first order, you earn a reward.'}
            </p>
            {session ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-lilac px-4 py-3">
                {referralQuery.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-royal" aria-hidden="true" />
                ) : (
                  <span className="font-mono text-sm font-bold tracking-widest text-plum">{referral?.code}</span>
                )}
                <button
                  onClick={() => referral && copy(referral.code, 'Referral code')}
                  aria-label="Copy referral code"
                  className="flex items-center gap-1.5 rounded-full bg-plum px-3 py-1.5 text-xs font-extrabold text-lilac active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth?next=/promos')}
                className="mt-3 w-full rounded-full bg-plum py-3 text-xs font-extrabold text-lilac active:scale-[0.98]"
              >
                Sign in for my code
              </button>
            )}
          </article>
        </div>
      )}

      <p className="mt-5 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Codes apply at checkout — type or paste them into the promo box on the checkout page. One code per order.
      </p>
      </div>
    </div>
  )
}
