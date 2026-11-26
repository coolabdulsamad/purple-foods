import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Bell, ChevronDown, Home, Loader2, MapPin, Minus, Plus, ReceiptText, Search, ShoppingBag, Star, User, WifiOff } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from './store'
import type { MenuItemDto, RestaurantDto } from './types'

/** Format kobo as naira: 280000 → "₦2,800" (kobo is the app-wide money unit). */
export const fmt = (kobo: number) => {
  const naira = kobo / 100
  return '₦' + naira.toLocaleString('en-NG', { minimumFractionDigits: naira % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}

export function hashStr(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const ART_PALETTES = [
  { bg: '#E9E4FB', plate: '#6B21A8', food: '#F59E0B', dot: '#2E1065' },
  { bg: '#FDE9C8', plate: '#2E1065', food: '#9333EA', dot: '#6B21A8' },
  { bg: '#D7F3E7', plate: '#2E1065', food: '#F59E0B', dot: '#10B981' },
  { bg: '#2E1065', plate: '#F59E0B', food: '#F5F3FF', dot: '#9333EA' },
]

export function DishArt({ seed, className }: { seed: string; className?: string }) {
  const h = hashStr(seed)
  const p = ART_PALETTES[h % ART_PALETTES.length]
  const rot = (h % 40) - 20
  const dots = Array.from({ length: 5 }, (_, i) => {
    const a = (((h >> (i * 4)) % 360) * Math.PI) / 180
    const r = 24 + ((h >> (i * 3)) % 14)
    return { x: 60 + Math.cos(a) * r, y: 62 + Math.sin(a) * r, r: 2.2 + ((h >> i) % 3) }
  })
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="120" height="120" fill={p.bg} />
      <g transform={`rotate(${rot} 60 62)`}>
        <circle cx="60" cy="64" r="42" fill={p.plate} />
        <circle cx="60" cy="64" r="30" fill={p.food} />
        <path d="M42 60 q18 -16 36 0" stroke={p.bg} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M46 72 q14 10 28 0" stroke={p.bg} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      </g>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={p.dot} opacity="0.85" />
      ))}
      <path d="M50 30 q5 -8 0 -15" stroke={p.plate} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M64 32 q-6 -8 0 -16" stroke={p.plate} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export function Grain() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16] mix-blend-soft-light" aria-hidden="true">
      <filter id="pf-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#pf-grain)" />
    </svg>
  )
}

export function Marquee({ items, dark }: { items: string[]; dark?: boolean }) {
  const text = items.join('  ·  ') + '  ·  '
  return (
    <div className={`overflow-hidden ${dark ? 'bg-plum-deep text-saffron' : 'bg-saffron text-plum-deep'}`} aria-hidden="true">
      <div className="flex w-max animate-marquee whitespace-nowrap py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em]">
        <span className="pr-4">{text}</span>
        <span className="pr-2">{text}</span>
      </div>
    </div>
  )
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${className}`}>{children}</span>
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Star className="h-3 w-3 fill-saffron text-saffron" aria-hidden="true" />
      {value.toFixed(1)}
    </span>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
      <WifiOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-plum">{message}</p>
      <button onClick={onRetry} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
        Retry
      </button>
    </div>
  )
}

function AreaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { area, setArea } = useStore()
  const areasQuery = trpc.catalog.areas.useQuery(undefined, { enabled: open })
  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Choose delivery area">
      <button className="absolute inset-0 bg-plum-deep/60" onClick={onClose} aria-label="Close area picker" />
      <div className="relative w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-8 md:rounded-3xl md:pb-5">
        <p className="font-display text-lg font-bold text-plum">Delivering to</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Pick your Abuja zone — menus and fees follow it.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          {(areasQuery.data ?? []).map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setArea({ id: a.id, name: a.name })
                onClose()
              }}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                a.id === area?.id ? 'border-royal bg-lilac text-plum' : 'border-border bg-background hover:bg-lilac'
              }`}
            >
              <MapPin className="mb-1 h-4 w-4 text-royal" aria-hidden="true" />
              {a.name}
            </button>
          ))}
          {areasQuery.isLoading && <p className="col-span-2 py-4 text-center text-xs text-muted-foreground md:col-span-3">Loading areas…</p>}
          {areasQuery.isError && <p className="col-span-2 py-4 text-center text-xs font-semibold text-destructive md:col-span-3">Could not load areas — check your connection and retry.</p>}
        </div>
      </div>
    </div>
  )
}

export function TopBar() {
  const { area, setArea, session, count } = useStore()
  const areasQuery = trpc.catalog.areas.useQuery()
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000,
  })
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length
  // Default to the first live area until the customer picks one, and
  // re-sync a stored area's name from the API (names can change server-side).
  useEffect(() => {
    if (!areasQuery.data?.length) return
    if (!area) {
      setArea({ id: areasQuery.data[0].id, name: areasQuery.data[0].name })
      return
    }
    const fresh = areasQuery.data.find((a) => a.id === area.id)
    if (fresh && fresh.name !== area.name) setArea({ id: fresh.id, name: fresh.name })
  }, [area, areasQuery.data, setArea])
  const [scrolled, setScrolled] = useState(false)
  const [sheet, setSheet] = useState(false)
  const loc = useLocation()
  const onDark = loc.pathname === '/' && !scrolled
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 72)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  const initial = (session?.user.name ?? session?.user.email ?? 'P').charAt(0).toUpperCase()
  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          onDark ? 'bg-transparent text-lilac' : 'bg-lilac/95 text-plum shadow-sm backdrop-blur'
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 md:h-16 md:gap-4 md:px-8">
          <Link to="/" className="shrink-0 font-display text-base font-extrabold tracking-tight md:text-lg">
            Purple<span className={onDark ? 'text-saffron' : 'text-royal'}>Foods</span>
          </Link>
          <button
            onClick={() => setSheet(true)}
            className="flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pr-2 text-sm font-semibold"
            aria-label={`Delivery area: ${area?.name ?? 'not set'}. Tap to change`}
          >
            <MapPin className={`h-4 w-4 shrink-0 ${onDark ? 'text-saffron' : 'text-royal'}`} aria-hidden="true" />
            <span className="truncate">{area?.name ?? 'Abuja'}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          </button>
          <Link
            to="/search"
            className={`mx-auto hidden w-full max-w-sm items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors md:flex ${
              onDark ? 'border-lilac/25 bg-lilac/10 text-lilac/70 hover:bg-lilac/20' : 'border-border bg-card text-muted-foreground hover:border-royal'
            }`}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            Search dishes, restaurants…
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 md:gap-2">
            <Link to="/restaurants" className="hidden rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-royal lg:block">
              Restaurants
            </Link>
            <Link to="/orders" className="hidden rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-royal lg:block">
              Orders
            </Link>
            <Link
              to="/notifications"
              aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
              className="relative rounded-full p-1.5 md:p-2"
            >
              <Bell className={`h-[18px] w-[18px] ${onDark ? 'text-lilac' : 'text-plum'}`} aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 font-mono text-[9px] font-bold text-plum-deep">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className={`hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-transform active:scale-95 md:flex ${
                onDark ? 'bg-saffron text-plum-deep' : 'bg-plum text-lilac'
              }`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Cart
              {count > 0 && (
                <span key={count} className={`flex h-5 min-w-5 animate-bump items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold ${onDark ? 'bg-plum-deep text-saffron' : 'bg-saffron text-plum-deep'}`}>
                  {count}
                </span>
              )}
            </Link>
            {session ? (
              <Link
                to="/account"
                aria-label="Your account"
                className="hidden h-9 w-9 items-center justify-center rounded-full bg-plum font-display text-sm font-extrabold text-lilac transition-transform active:scale-95 md:flex"
              >
                {initial}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className={`hidden rounded-full border px-4 py-2 text-sm font-bold transition-colors md:block ${
                    onDark ? 'border-lilac/30 text-lilac hover:bg-lilac/10' : 'border-plum/20 text-plum hover:bg-lilac'
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  to="/auth/signup"
                  className={`hidden rounded-full px-4 py-2 text-sm font-bold transition-transform active:scale-95 md:block ${
                    onDark ? 'bg-saffron text-plum-deep' : 'bg-royal text-lilac hover:bg-plum'
                  }`}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <AreaSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  )
}

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/account', label: 'Account', icon: User },
]

export function BottomNav() {
  const { count } = useStore()
  const loc = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main navigation">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(t.to)
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors duration-150 ${
                active ? 'text-royal' : 'text-muted-foreground hover:text-plum'
              }`}
            >
              <span className="relative">
                <t.icon className="h-5 w-5" aria-hidden="true" />
                {t.to === '/cart' && count > 0 && (
                  <span
                    key={count}
                    className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 animate-bump items-center justify-center rounded-full bg-saffron px-1 font-mono text-[10px] font-bold text-plum-deep"
                  >
                    {count}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pb-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-lg font-extrabold tracking-tight text-plum">
              Purple<span className="text-royal">Foods</span>
            </p>
            <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
              Abuja’s restaurants, grills and bukas — tracked from flame to your doorstep.
            </p>
          </div>
          <nav aria-label="Explore">
            <Mono className="text-royal">[EXPLORE]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-plum">
              <li><Link to="/restaurants" className="transition-colors hover:text-royal">Restaurants</Link></li>
              <li><Link to="/search" className="transition-colors hover:text-royal">Search</Link></li>
              <li><Link to="/promos" className="transition-colors hover:text-royal">Promos & referrals</Link></li>
              <li><Link to="/help" className="transition-colors hover:text-royal">Help & support</Link></li>
            </ul>
          </nav>
          <nav aria-label="Account">
            <Mono className="text-royal">[ACCOUNT]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-plum">
              <li><Link to="/orders" className="transition-colors hover:text-royal">Orders</Link></li>
              <li><Link to="/favorites" className="transition-colors hover:text-royal">Favorites</Link></li>
              <li><Link to="/account/addresses" className="transition-colors hover:text-royal">Saved addresses</Link></li>
              <li><Link to="/notifications" className="transition-colors hover:text-royal">Notifications</Link></li>
            </ul>
          </nav>
          <div>
            <Mono className="text-royal">[CONTACT]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-plum">
              <li><a href="mailto:support@purplefoods.ng" className="break-all transition-colors hover:text-royal">support@purplefoods.ng</a></li>
              <li><a href="tel:+2348000000000" className="transition-colors hover:text-royal">0800 000 0000</a></li>
              <li className="font-normal text-muted-foreground">Abuja, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-1 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:flex-row md:justify-between">
          <span>Purple Foods · © Smadsoft Technology Limited</span>
          <span>Customer · Rider · Merchant · Admin</span>
        </div>
      </div>
    </footer>
  )
}

export function AddButton({ item, r }: { item: MenuItemDto; r: RestaurantDto }) {
  const { lines, add, setQty } = useStore()
  const line = lines.find((l) => l.key === `${r.id}:${item.id}`)
  if (!line) {
    return (
      <button
        onClick={() => add(item, r)}
        className="rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac transition-transform duration-150 hover:bg-royal active:scale-95"
      >
        ADD · {fmt(item.priceKobo)}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-plum px-1.5 py-1 text-lilac">
      <button onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Reduce ${item.name} quantity`} className="rounded-full p-1.5 transition-colors duration-150 hover:bg-royal active:scale-95">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span key={line.qty} className="min-w-5 animate-bump text-center font-mono text-sm font-bold">
        {line.qty}
      </span>
      <button onClick={() => setQty(line.key, line.qty + 1)} aria-label={`Add one more ${item.name}`} className="rounded-full p-1.5 transition-colors duration-150 hover:bg-royal active:scale-95">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
