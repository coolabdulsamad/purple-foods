import { useNavigate } from 'react-router'
import { Bell, Info, ReceiptText, Tag } from 'lucide-react'
import { useEffect } from 'react'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { ErrorBlock, LoadingBlock, PageHero } from '../ui'

const KIND_ICON = { order: ReceiptText, promo: Tag, info: Info } as const

export default function NotificationsPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: !!session })
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  })

  // Opening the inbox marks everything read (after the data has rendered).
  const items = notificationsQuery.data ?? []
  const hasUnread = items.some((n) => !n.readAt)
  useEffect(() => {
    if (session && hasUnread && !markAll.isPending && !markAll.isSuccess) {
      const t = setTimeout(() => markAll.mutate(), 1200)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, hasUnread])

  if (!session) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <Bell className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Sign in for notifications</h1>
        <button onClick={() => navigate('/auth')} className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <PageHero icon={Bell} title="Notifications" sub="Inbox" />
      <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
      {notificationsQuery.isLoading ? (
        <LoadingBlock label="Loading notifications…" />
      ) : notificationsQuery.isError ? (
        <ErrorBlock message="Could not load notifications." onRetry={() => notificationsQuery.refetch()} />
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">All quiet for now</p>
          <p className="mt-1 text-xs text-muted-foreground">Order updates and promos land here.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {items.map((n) => {
            const Icon = KIND_ICON[n.kind] ?? Info
            const date = new Date(n.createdAt)
            return (
              <li
                key={n.id}
                className={`flex gap-3 rounded-2xl border p-4 ${n.readAt ? 'border-border bg-card' : 'border-royal/40 bg-lilac'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${n.kind === 'promo' ? 'bg-saffron-soft text-saffron' : n.kind === 'order' ? 'bg-mint-soft text-mint' : 'bg-lilac-deep text-royal'}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-plum">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </div>
    </div>
  )
}
