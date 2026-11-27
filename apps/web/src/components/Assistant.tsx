import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  Bot,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import type {
  AssistantDishDto,
  AssistantMessageDto,
  AssistantReplyDto,
  AssistantRestaurantDto,
} from '../types'
import { DishImage, fmt, MerchantLogo } from '../ui'

interface ChatTurn extends AssistantMessageDto {
  dishes?: AssistantDishDto[]
  restaurants?: AssistantRestaurantDto[]
  actions?: { label: string; path: string }[]
  aiPowered?: boolean
}

const SUGGESTIONS = [
  'Suggest food for me',
  'Food under ₦2,000',
  'Something spicy 🌶️',
  'Show me promos',
  'Where do you deliver?',
  'How do I pay?',
]

function DishCard({ d }: { d: AssistantDishDto }) {
  return (
    <Link
      to={`/item/${d.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-royal hover:bg-lilac/60"
    >
      <DishImage src={d.photoUrl} seed={d.id} className="h-12 w-12 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-plum">{d.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {d.merchantName} · {d.etaMin}–{d.etaMax} min
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs font-bold text-royal">{fmt(d.priceKobo)}</span>
    </Link>
  )
}

function RestaurantCard({ r }: { r: AssistantRestaurantDto }) {
  return (
    <Link
      to={`/r/${r.slug}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-royal hover:bg-lilac/60"
    >
      <MerchantLogo
        r={{
          id: r.slug,
          slug: r.slug,
          name: r.name,
          areaId: '',
          areaName: r.areaName,
          tags: r.tags,
          promo: null,
          deliveryFeeKobo: r.deliveryFeeKobo,
          etaMin: r.etaMin,
          etaMax: r.etaMax,
          rating: r.rating,
          reviewCount: 0,
          isOpen: true,
          coverUrl: r.coverUrl,
          logoUrl: r.logoUrl,
        }}
        className="h-10 w-10 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-plum">{r.name}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-saffron text-saffron" aria-hidden="true" />
          {r.rating.toFixed(1)} · {r.areaName} · {fmt(r.deliveryFeeKobo)} fee
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
    </Link>
  )
}

/** Purple — the floating AI assistant. Works for guests and customers;
 *  searches the real menu, understands budgets, and deep-links into the app. */
export function Assistant() {
  const { area } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const chat = trpc.assistant.chat.useMutation()
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, chat.isPending, open])

  const send = (text: string) => {
    const content = text.trim()
    if (!content || chat.isPending) return
    setInput('')
    const history: AssistantMessageDto[] = [
      ...turns.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content },
    ]
    setTurns((prev) => [...prev, { role: 'user', content }])
    chat.mutate(
      { messages: history.slice(-20), areaName: area?.name },
      {
        onSuccess: (reply: AssistantReplyDto) => {
          setTurns((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: reply.reply,
              dishes: reply.dishes,
              restaurants: reply.restaurants,
              actions: reply.actions,
              aiPowered: reply.aiPowered,
            },
          ])
        },
        onError: () => {
          setTurns((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Network wahala — I could not reach the kitchen brain. Please try again.',
            },
          ])
        },
      },
    )
  }

  return (
    <>
      {/* Floating launcher — sits above the bottom nav on mobile. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Purple, the AI assistant"
        className={`fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-royal to-plum shadow-xl shadow-plum/40 transition-all duration-300 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 ${
          open ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-royal/30 [animation-duration:2.5s]" aria-hidden="true" />
        <Sparkles className="h-6 w-6 text-saffron" aria-hidden="true" />
      </button>

      {/* Chat dialog */}
      <div
        className={`fixed inset-x-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-3xl border border-royal/25 bg-background shadow-2xl shadow-plum-deep/40 transition-all duration-300 sm:inset-x-auto sm:right-6 sm:w-[26rem] ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-6 opacity-0'
        }`}
        style={{ height: 'min(34rem, 78dvh)' }}
        role="dialog"
        aria-label="Purple AI assistant"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-plum-deep via-plum to-royal px-4 py-3.5 text-lilac">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/20 ring-1 ring-saffron/40">
            <Bot className="h-5 w-5 text-saffron" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold tracking-tight">Purple</p>
            <p className="truncate text-[11px] text-lilac/70">
              Your food assistant{area ? ` · ${area.name}` : ''} — ask me anything
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="rounded-full p-1.5 transition-colors hover:bg-lilac/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-lilac/40 p-3.5">
          {turns.length === 0 && (
            <div className="space-y-3 pt-2">
              <div className="rounded-2xl rounded-tl-md border border-border bg-card p-3.5 text-sm leading-relaxed text-plum shadow-sm">
                <p className="font-bold">Hey! I’m Purple 👋</p>
                <p className="mt-1 text-muted-foreground">
                  I know every restaurant and dish here. Try me — I can find food
                  within your budget, track orders, explain promos and more.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-royal/30 bg-card px-3 py-1.5 text-[11px] font-bold text-royal transition-colors hover:bg-royal hover:text-lilac"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) =>
            t.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-royal px-3.5 py-2.5 text-sm font-medium text-lilac shadow-sm">
                  {t.content}
                </p>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-plum shadow-sm">
                  {t.content}
                  {t.aiPowered && (
                    <span className="mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-royal/70">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> AI-powered
                    </span>
                  )}
                </div>
                {t.dishes && t.dishes.length > 0 && (
                  <div className="grid gap-1.5">
                    {t.dishes.map((d) => (
                      <DishCard key={d.id} d={d} />
                    ))}
                  </div>
                )}
                {t.restaurants && t.restaurants.length > 0 && (
                  <div className="grid gap-1.5">
                    {t.restaurants.map((r) => (
                      <RestaurantCard key={r.slug} r={r} />
                    ))}
                  </div>
                )}
                {t.actions && t.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.actions.map((a) => (
                      <button
                        key={a.path + a.label}
                        onClick={() => {
                          setOpen(false)
                          navigate(a.path)
                        }}
                        className="flex items-center gap-1 rounded-full bg-plum px-3 py-1.5 text-[11px] font-bold text-lilac transition-transform active:scale-95"
                      >
                        {a.label}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {chat.isPending && (
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm w-fit">
              <Loader2 className="h-4 w-4 animate-spin text-royal" aria-hidden="true" />
              Purple is thinking…
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-border bg-card p-3"
        >
          <MapPin className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for food, budgets, promos…"
            aria-label="Message Purple"
            className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-plum outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-royal"
          />
          <button
            type="submit"
            disabled={!input.trim() || chat.isPending}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal text-lilac transition-transform active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  )
}
