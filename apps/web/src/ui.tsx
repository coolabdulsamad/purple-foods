import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronDown, Home, MapPin, Minus, Plus, ReceiptText, ShoppingBag, User } from 'lucide-react'
import { AREAS } from './data'
import { useStore } from './store'
import type { MenuItem, Restaurant } from './types'

export const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')

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

function AreaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { area, setArea } = useStore()
  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Choose delivery area">
      <button className="absolute inset-0 bg-plum-deep/60" onClick={onClose} aria-label="Close area picker" />
      <div className="relative w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-8">
        <p className="font-display text-lg font-bold text-plum">Delivering to</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Pick your Lagos zone — menus and fees follow it.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setArea(a)
                onClose()
              }}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                a === area ? 'border-royal bg-lilac text-plum' : 'border-border bg-background hover:bg-lilac'
              }`}
            >
              <MapPin className="mb-1 h-4 w-4 text-royal" aria-hidden="true" />
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TopBar() {
  const { area } = useStore()
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
  return (
    <>
      <header
        className={`fixed left-1/2 top-0 z-40 w-full max-w-[480px] -translate-x-1/2 transition-colors duration-300 ${
          onDark ? 'bg-transparent text-lilac' : 'bg-lilac/95 text-plum shadow-sm backdrop-blur'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSheet(true)}
            className="flex items-center gap-1.5 rounded-full py-1.5 pr-2 text-sm font-semibold"
            aria-label={`Delivery area: ${area}. Tap to change`}
          >
            <MapPin className={`h-4 w-4 ${onDark ? 'text-saffron' : 'text-royal'}`} aria-hidden="true" />
            {area}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </button>
          <Link to="/" className="font-display text-base font-extrabold tracking-tight">
            Purple<span className={onDark ? 'text-saffron' : 'text-royal'}>Foods</span>
          </Link>
        </div>
      </header>
      <AreaSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  )
}

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/account', label: 'Account', icon: User },
]

export function BottomNav() {
  const { count } = useStore()
  const loc = useLocation()
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main navigation">
      <div className="grid grid-cols-4">
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

export function AddButton({ item, r }: { item: MenuItem; r: Restaurant }) {
  const { lines, add, setQty } = useStore()
  const line = lines.find((l) => l.key === `${r.id}:${item.id}`)
  if (!line) {
    return (
      <button
        onClick={() => add(item, r)}
        className="rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac transition-transform duration-150 hover:bg-royal active:scale-95"
      >
        ADD · {fmt(item.price)}
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
