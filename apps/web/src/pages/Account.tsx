import { Link } from 'react-router'
import {
  Bell, ChevronRight, Heart, LifeBuoy, LogOut, MapPin, Pencil, ShieldCheck, Tag, User,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Grain, Mono } from '../ui'

export default function AccountPage() {
  const { session, signOut } = useStore()
  const logout = trpc.auth.logout.useMutation()
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: !!session })
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length

  const handleSignOut = () => {
    logout.mutate()
    signOut()
    toast.success('Signed out')
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-20 md:px-8 md:pt-24">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Account</h1>
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-plum-deep p-5 text-lilac">
          <Grain />
          <Mono className="text-saffron">[YOUR ACCOUNT]</Mono>
          <h2 className="mt-2 font-display text-xl font-extrabold leading-tight">
            One account for orders, addresses, favorites and tracking.
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-lilac/75">
            Sign in with Google, email or your phone number — whatever is easiest.
          </p>
          <Link
            to="/auth"
            className="mt-4 block rounded-full bg-saffron py-3.5 text-center font-display text-sm font-extrabold text-plum-deep transition-transform duration-150 active:scale-[0.98]"
          >
            Sign in or create an account
          </Link>
        </div>
        <section className="mt-4 grid gap-2 pb-4 sm:grid-cols-2">
          <MenuRow to="/promos" icon={Tag} label="Promos & referrals" />
          <MenuRow to="/help" icon={LifeBuoy} label="Help & support" />
        </section>
      </div>
    )
  }

  const initial = (session.user.name ?? session.user.email ?? session.user.phone ?? 'P').charAt(0).toUpperCase()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-20 md:px-8 md:pt-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Account</h1>

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-mint bg-mint-soft p-4">
        {session.user.avatarUrl ? (
          <img src={session.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum font-display text-lg font-extrabold text-lilac">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-plum">
            {session.user.name ?? 'Purple Foods customer'}
            <ShieldCheck className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {session.user.phone ?? session.user.email ?? ''}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Signed in until {new Date(session.expiresAt).toLocaleDateString()}
          </p>
        </div>
        <Link to="/account/edit" aria-label="Edit profile" className="rounded-full bg-card p-2.5 text-plum shadow-sm transition-transform active:scale-95">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MenuRow to="/account/edit" icon={User} label="Edit profile" sub="Name and phone number" />
        <MenuRow to="/account/addresses" icon={MapPin} label="Saved addresses" sub="Home, work, anywhere" />
        <MenuRow to="/favorites" icon={Heart} label="Favorites" sub="Your saved restaurants" />
        <MenuRow to="/notifications" icon={Bell} label="Notifications" badge={unread} />
        <MenuRow to="/promos" icon={Tag} label="Promos & referrals" />
        <MenuRow to="/help" icon={LifeBuoy} label="Help & support" />
      </section>

      <button
        onClick={handleSignOut}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-card py-3.5 text-sm font-bold text-destructive transition-transform duration-150 active:scale-[0.98] sm:max-w-xs"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>

      <p className="pb-4 pt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Purple Foods · © Smadsoft Technology Limited
      </p>
    </div>
  )
}

function MenuRow({
  to,
  icon: Icon,
  label,
  sub,
  badge,
}: {
  to: string
  icon: typeof User
  label: string
  sub?: string
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-lilac active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lilac text-royal">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-plum">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      {badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-saffron px-1.5 font-mono text-[10px] font-bold text-plum-deep">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </Link>
  )
}
