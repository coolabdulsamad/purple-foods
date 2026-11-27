import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Bell, ChevronDown, Loader2, MapPin, Minus, Plus, ReceiptText, Search, ShoppingBag, Star, Store, User, WifiOff } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useStore } from './store'
import { LocationDialog } from './components/LocationDialog'
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

/** Real dish photo with DishArt fallback (missing URL or failed load). */
export function DishImage({ src, seed, className }: { src?: string | null; seed: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <DishArt seed={seed} className={className} />
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className ?? ''} object-cover`} />
}

/** Circular restaurant logo badge (generated brand mark, DishArt fallback). */
export function MerchantLogo({ r, className }: { r: RestaurantDto; className?: string }) {
  return (
    <span className={`block shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-md ${className ?? ''}`}>
      <DishImage src={r.logoUrl} seed={`${r.id}-logo`} className="h-full w-full" />
    </span>
  )
}

/**
 * Branded restaurant card — Glovo-style: cover photo with gradient scrim,
 * promo + ETA pills on the image, logo badge overlapping, name + rating,
 * tags and delivery fee below. Used on Search / Restaurants / Home /
 * Category / Favorites so every listing looks identical.
 */
export function MerchantCard({ r, coverClass = 'h-40' }: { r: RestaurantDto; coverClass?: string }) {
  return (
    <Link
      to={`/r/${r.slug}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]"
    >
      <div className={`relative w-full overflow-hidden ${coverClass}`}>
        <DishImage
          src={r.coverUrl}
          seed={r.id}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" aria-hidden="true" />
        {r.promo && (
          <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-saffron px-2.5 py-1 text-[11px] font-extrabold text-plum shadow">
            {r.promo}
          </span>
        )}
        {!r.isOpen && (
          <span className="absolute right-3 top-3 rounded-full bg-plum/85 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-lilac">
            CLOSED
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-plum shadow">
          {r.etaMin}–{r.etaMax} min
        </span>
      </div>
      <div className="relative px-4 pb-4">
        <MerchantLogo r={r} className="-mt-7 h-14 w-14 border-[3px] shadow-lg" />
        <div className="mt-2 flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-extrabold tracking-tight text-plum">{r.name}</h3>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-saffron-soft px-2 py-0.5 text-xs font-extrabold text-plum">
            <Star className="h-3 w-3 fill-saffron text-saffron" aria-hidden="true" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {r.tags.slice(0, 3).join(' · ')} — {r.areaName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <span className="rounded-full bg-lilac px-2 py-0.5">{r.reviewCount.toLocaleString()} reviews</span>
          <span className="rounded-full bg-lilac px-2 py-0.5">
            {r.deliveryFeeKobo === 0 ? 'Free delivery' : `${fmt(r.deliveryFeeKobo)} delivery`}
          </span>
        </div>
      </div>
    </Link>
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

/** Rich gradient page header — replaces bare white page tops with the
 *  brand band. Renders below the fixed TopBar (pt-20/24 handled inside). */
export function PageHero({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: typeof Bell
  title: string
  sub: string
  children?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-plum-deep via-plum to-royal px-4 pb-7 pt-24 text-lilac md:px-8 md:pt-28">
      <Grain />
      <div className="relative mx-auto flex w-full max-w-5xl items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-saffron/20 ring-1 ring-saffron/40">
          <Icon className="h-6 w-6 text-saffron" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
          <Mono className="text-lilac/70">{sub}</Mono>
        </div>
        {children}
      </div>
    </div>
  )
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

export function TopBar() {
  const { area, setArea, session, count } = useStore()
  const areasQuery = trpc.catalog.areas.useQuery()
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000,
  })
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length
  // Re-sync a stored area's label from the API (names/cities can change
  // server-side). There is deliberately no auto-default: the Home page pops
  // the location dialog until the customer picks a zone themselves.
  useEffect(() => {
    if (!area || !areasQuery.data?.length) return
    const fresh = areasQuery.data.find((a) => a.id === area.id)
    if (fresh && (fresh.name !== area.name || fresh.cityName !== area.cityName)) {
      setArea({ id: fresh.id, name: fresh.name, cityName: fresh.cityName })
    }
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
  const avatarUrl = session?.user.avatarUrl ?? null
  return (
    <>
      {/* Deep-plum header everywhere; transparent only over the Home hero. */}
      <header
        className={`fixed inset-x-0 top-0 z-40 text-lilac transition-colors duration-300 ${
          onDark
            ? 'bg-transparent'
            : 'bg-gradient-to-r from-plum-deep via-plum to-royal shadow-lg shadow-plum-deep/25'
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 md:h-16 md:gap-4 md:px-8">
          <Link to="/" className="shrink-0 font-display text-base font-extrabold tracking-tight md:text-lg">
            Purple<span className="text-saffron">Foods</span>
          </Link>
          <button
            onClick={() => setSheet(true)}
            className="flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pr-2 text-sm font-semibold"
            aria-label={`Delivery area: ${area?.name ?? 'not set'}. Tap to change`}
          >
            <MapPin className="h-4 w-4 shrink-0 text-saffron" aria-hidden="true" />
            <span className="truncate">{area ? `${area.name}${area.cityName ? `, ${area.cityName}` : ''}` : 'Choose location'}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          </button>
          <Link
            to="/search"
            className="mx-auto hidden w-full max-w-sm items-center gap-2 rounded-full border border-lilac/25 bg-lilac/10 px-4 py-2 text-sm font-medium text-lilac/70 transition-colors hover:bg-lilac/20 md:flex"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            Search dishes, restaurants…
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 md:gap-2">
            <Link to="/restaurants" className="hidden rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-saffron lg:block">
              Restaurants
            </Link>
            <Link to="/orders" className="hidden rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-saffron lg:block">
              Orders
            </Link>
            <Link
              to="/notifications"
              aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
              className="relative rounded-full p-1.5 md:p-2"
            >
              <Bell className="h-[18px] w-[18px] text-lilac" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 font-mono text-[9px] font-bold text-plum-deep">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="hidden items-center gap-2 rounded-full bg-saffron px-4 py-2 text-sm font-bold text-plum-deep transition-transform active:scale-95 md:flex"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Cart
              {count > 0 && (
                <span key={count} className="flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-plum-deep px-1 font-mono text-[10px] font-bold text-saffron">
                  {count}
                </span>
              )}
            </Link>
            {session ? (
              <Link
                to="/account"
                aria-label="Your account"
                className="hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-saffron font-display text-sm font-extrabold text-plum-deep ring-2 ring-lilac/30 transition-transform active:scale-95 md:flex"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden rounded-full border border-lilac/30 px-4 py-2 text-sm font-bold text-lilac transition-colors hover:bg-lilac/10 md:block"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth/signup"
                  className="hidden rounded-full bg-saffron px-4 py-2 text-sm font-bold text-plum-deep transition-transform active:scale-95 md:block"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <LocationDialog open={sheet} onClose={() => setSheet(false)} />
    </>
  )
}

const TABS = [
  { to: '/restaurants', label: 'Restaurants', icon: Store },
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
    <footer className="bg-plum-deep text-lilac">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pb-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-lg font-extrabold tracking-tight">
              Purple<span className="text-saffron">Foods</span>
            </p>
            <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-lilac/60">
              Abuja’s restaurants, grills and bukas — tracked from flame to your doorstep.
            </p>
          </div>
          <nav aria-label="Explore">
            <Mono className="text-saffron">[EXPLORE]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><Link to="/restaurants" className="transition-colors hover:text-saffron">Restaurants</Link></li>
              <li><Link to="/search" className="transition-colors hover:text-saffron">Search</Link></li>
              <li><Link to="/promos" className="transition-colors hover:text-saffron">Promos & referrals</Link></li>
              <li><Link to="/help" className="transition-colors hover:text-saffron">Help & support</Link></li>
            </ul>
          </nav>
          <nav aria-label="Account">
            <Mono className="text-saffron">[ACCOUNT]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><Link to="/orders" className="transition-colors hover:text-saffron">Orders</Link></li>
              <li><Link to="/favorites" className="transition-colors hover:text-saffron">Favorites</Link></li>
              <li><Link to="/account/addresses" className="transition-colors hover:text-saffron">Saved addresses</Link></li>
              <li><Link to="/notifications" className="transition-colors hover:text-saffron">Notifications</Link></li>
            </ul>
          </nav>
          <div>
            <Mono className="text-saffron">[CONTACT]</Mono>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><a href="mailto:support@purplefoods.ng" className="break-all transition-colors hover:text-saffron">support@purplefoods.ng</a></li>
              <li><a href="tel:+2348000000000" className="transition-colors hover:text-saffron">0800 000 0000</a></li>
              <li className="font-normal text-lilac/60">Abuja, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-1 border-t border-lilac/15 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-lilac/50 md:flex-row md:justify-between">
          <span>Purple Foods · © Smadsoft Technology Limited</span>
          <span>Customer · Rider · Merchant · Admin</span>
        </div>
      </div>
    </footer>
  )
}

export function AddButton({ item, r }: { item: MenuItemDto; r: RestaurantDto }) {
  const { lines, add, setQty } = useStore()
  const navigate = useNavigate()
  // Items with topping groups are configured on the item page — a bare
  // quick-add would skip toppings, notes and allergies.
  if ((item.optionGroups ?? []).length > 0) {
    return (
      <button
        onClick={() => navigate(`/item/${item.id}`)}
        className="rounded-full bg-royal px-4 py-2 text-xs font-bold text-lilac transition-transform duration-150 hover:bg-plum active:scale-95"
      >
        CUSTOMIZE · {fmt(item.priceKobo)}+
      </button>
    )
  }
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
