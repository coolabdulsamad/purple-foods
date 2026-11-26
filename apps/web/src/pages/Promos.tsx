import { useNavigate } from 'react-router'
import { ArrowLeft, Copy, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../store'
import { Grain, Mono } from '../ui'

const PROMOS = [
  {
    title: 'Free delivery on your first order',
    body: 'Applied automatically at checkout — no code needed, while the launch window lasts.',
    tag: 'AUTO-APPLIED',
    code: null as string | null,
  },
  {
    title: 'Invite friends, eat free',
    body: 'Your code gives them ₦1,000 off their first order. You earn a free-delivery credit the moment their food arrives.',
    tag: 'REFERRAL',
    code: 'ref' as const,
  },
  {
    title: 'Suya nights, till 2am',
    body: 'Late grills from Wuse to Gwarinpa every Friday to Sunday. Yaji-heavy, flame-first.',
    tag: 'WEEKENDS',
    code: null,
  },
]

export default function PromosPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const code = 'PURPLE-' + (session?.user.name ? String(1000 + (session.user.name.length * 37) % 9000) : 'GUEST')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Referral code copied', { description: code })
    } catch {
      toast.info(`Your code: ${code}`)
    }
  }

  return (
    <div className="px-4 pt-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full border border-border bg-card p-2.5 text-plum transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Promos & referrals</h1>
          <Mono className="text-muted-foreground">[LIVE OFFERS]</Mono>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {PROMOS.map((p) => (
          <article key={p.title} className="relative overflow-hidden rounded-2xl bg-plum-deep p-4 text-lilac">
            <Grain />
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-saffron" aria-hidden="true" />
              <Mono className="text-saffron">[{p.tag}]</Mono>
            </div>
            <h2 className="mt-2 font-display text-lg font-extrabold leading-tight">{p.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-lilac/80">{p.body}</p>
            {p.code === 'ref' && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-plum px-4 py-3">
                <span className="font-mono text-sm font-bold tracking-widest text-saffron">{code}</span>
                <button
                  onClick={copy}
                  aria-label="Copy referral code"
                  className="flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-xs font-extrabold text-plum-deep active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="mt-5 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Promo engine with real codes and usage limits ships with the payments phase. Launch offers above apply automatically.
      </p>
    </div>
  )
}
