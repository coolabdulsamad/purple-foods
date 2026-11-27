import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  Bot,
  History,
  Loader2,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Star,
  Trash2,
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

interface ChatSession {
  id: string
  createdAt: number
  turns: ChatTurn[]
}

interface AiStore {
  activeId: string
  chats: ChatSession[]
}

const LS_KEY = 'pf2-ai-chats-v1'
const MAX_CHATS = 30
const MAX_TURNS_PER_CHAT = 60

const newSession = (): ChatSession => ({
  id: Math.random().toString(36).slice(2) + Date.now().toString(36),
  createdAt: Date.now(),
  turns: [],
})

function loadStore(): AiStore {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as AiStore
      if (p && Array.isArray(p.chats) && p.chats.length > 0) {
        return {
          activeId: p.chats.some((c) => c.id === p.activeId) ? p.activeId : p.chats[0].id,
          chats: p.chats,
        }
      }
    }
  } catch {
    /* corrupted storage — start fresh */
  }
  const c = newSession()
  return { activeId: c.id, chats: [c] }
}

const titleOf = (c: ChatSession) =>
  c.turns.find((t) => t.role === 'user')?.content.slice(0, 38) || 'New conversation'

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
 *  searches the real menu, understands budgets, and deep-links into the app.
 *  Conversations persist on-device: start new chats, switch, delete. */
export function Assistant() {
  const { area } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [store, setStore] = useState<AiStore>(loadStore)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [input, setInput] = useState('')
  const chat = trpc.assistant.chat.useMutation()
  const listRef = useRef<HTMLDivElement | null>(null)

  const active = store.chats.find((c) => c.id === store.activeId) ?? store.chats[0]
  const turns = active?.turns ?? []

  // Persist conversations on-device.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      /* storage full — chatting still works, history just won't persist */
    }
  }, [store])

  // The page guide's "Ask Purple about this page" button opens the dialog.
  useEffect(() => {
    const f = () => setOpen(true)
    window.addEventListener('pf:assistant-open', f)
    return () => window.removeEventListener('pf:assistant-open', f)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, chat.isPending, open, view])

  /** Replace the active chat's turns (capped, so storage stays small). */
  const updateActive = (fn: (turns: ChatTurn[]) => ChatTurn[]) => {
    setStore((s) => ({
      ...s,
      chats: s.chats.map((c) =>
        c.id === s.activeId ? { ...c, turns: fn(c.turns).slice(-MAX_TURNS_PER_CHAT) } : c,
      ),
    }))
  }

  const startNewChat = () => {
    const c = newSession()
    setStore((s) => ({ activeId: c.id, chats: [c, ...s.chats].slice(0, MAX_CHATS) }))
    setView('chat')
  }

  const deleteChat = (id: string) => {
    setStore((s) => {
      let chats = s.chats.filter((c) => c.id !== id)
      if (chats.length === 0) chats = [newSession()]
      return {
        activeId: chats.some((c) => c.id === s.activeId) ? s.activeId : chats[0].id,
        chats,
      }
    })
  }

  const openChat = (id: string) => {
    setStore((s) => ({ ...s, activeId: id }))
    setView('chat')
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || chat.isPending) return
    setInput('')
    setView('chat')
    const history: AssistantMessageDto[] = [
      ...turns.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content },
    ]
    updateActive((prev) => [...prev, { role: 'user', content }])
    chat.mutate(
      { messages: history.slice(-20), areaName: area?.name },
      {
        onSuccess: (reply: AssistantReplyDto) => {
          updateActive((prev) => [
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
          updateActive((prev) => [
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
        <div className="flex items-center gap-2 bg-gradient-to-r from-plum-deep via-plum to-royal px-4 py-3.5 text-lilac">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/20 ring-1 ring-saffron/40">
            <Bot className="h-5 w-5 text-saffron" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold tracking-tight">Purple</p>
            <p className="truncate text-[11px] text-lilac/70">
              {view === 'history'
                ? 'Your conversations'
                : `Your food assistant${area ? ` · ${area.name}` : ''} — ask me anything`}
            </p>
          </div>
          <button
            onClick={() => setView(view === 'history' ? 'chat' : 'history')}
            aria-label={view === 'history' ? 'Back to chat' : 'Chat history'}
            aria-pressed={view === 'history'}
            className={`rounded-full p-1.5 transition-colors hover:bg-lilac/10 ${view === 'history' ? 'bg-lilac/15 text-saffron' : ''}`}
          >
            <History className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={startNewChat}
            aria-label="Start a new chat"
            className="rounded-full p-1.5 transition-colors hover:bg-lilac/10"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="rounded-full p-1.5 transition-colors hover:bg-lilac/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {view === 'history' ? (
          /* ── Chat history list ──────────────────────────────────── */
          <div className="flex-1 space-y-2 overflow-y-auto bg-lilac/40 p-3.5">
            <button
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron py-3 text-sm font-extrabold text-plum-deep shadow-sm transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Start a new chat
            </button>
            {store.chats.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 rounded-2xl border p-2.5 shadow-sm transition-colors ${
                  c.id === store.activeId
                    ? 'border-royal bg-lilac ring-1 ring-royal'
                    : 'border-border bg-card hover:border-royal/40'
                }`}
              >
                <button onClick={() => openChat(c.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-bold text-plum">{titleOf(c)}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">
                    {c.turns.length} message{c.turns.length === 1 ? '' : 's'} ·{' '}
                    {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    {c.id === store.activeId ? ' · current' : ''}
                  </span>
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  aria-label={`Delete chat: ${titleOf(c)}`}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <p className="pt-1 text-center text-[10px] leading-relaxed text-muted-foreground">
              Chats are stored on this device only — delete any you no longer need.
            </p>
          </div>
        ) : (
          /* ── Messages ───────────────────────────────────────────── */
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
              <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-royal" aria-hidden="true" />
                Purple is thinking…
              </div>
            )}
          </div>
        )}

        {/* Composer — chat view only */}
        {view === 'chat' && (
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
        )}
      </div>
    </>
  )
}
