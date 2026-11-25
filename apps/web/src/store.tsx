import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { CartLine, CartRestaurant, Profile, SelectedArea } from './types'
import type { MenuItemDto, RestaurantDto } from './types'

interface StoreShape {
  area: SelectedArea | null
  setArea: (a: SelectedArea) => void
  lines: CartLine[]
  count: number
  subtotalKobo: number
  deliveryFeeKobo: number
  totalKobo: number
  cartRestaurant: CartRestaurant | null
  add: (item: MenuItemDto, r: RestaurantDto) => void
  setQty: (key: string, qty: number) => void
  clear: () => void
  profile: Profile
  saveProfile: (p: Profile) => void
}

const StoreCtx = createContext<StoreShape | null>(null)

const EMPTY_PROFILE: Profile = { name: '', phone: '', street: '', notes: '' }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<SelectedArea | null>(() => read('pf2-area', null))
  const [lines, setLines] = useState<CartLine[]>(() => read('pf2-cart', []))
  const [profile, setProfile] = useState<Profile>(() => read('pf2-profile', EMPTY_PROFILE))

  useEffect(() => localStorage.setItem('pf2-area', JSON.stringify(area)), [area])
  useEffect(() => localStorage.setItem('pf2-cart', JSON.stringify(lines)), [lines])
  useEffect(() => localStorage.setItem('pf2-profile', JSON.stringify(profile)), [profile])

  const value = useMemo<StoreShape>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotalKobo = lines.reduce((n, l) => n + l.priceKobo * l.qty, 0)
    const cartRestaurant = lines.length ? lines[0].restaurant : null
    const deliveryFeeKobo = lines.length ? lines[0].restaurant.deliveryFeeKobo : 0
    return {
      area,
      setArea,
      lines,
      count,
      subtotalKobo,
      deliveryFeeKobo,
      totalKobo: subtotalKobo + deliveryFeeKobo,
      cartRestaurant,
      add: (item, r) => {
        setLines((prev) => {
          const foreign = prev.find((l) => l.restaurant.id !== r.id)
          const base = foreign ? [] : prev
          if (foreign) toast.info(`Cart switched to ${r.name}`, { description: 'One restaurant per order — previous items cleared.' })
          const snapshot: CartRestaurant = { id: r.id, slug: r.slug, name: r.name, deliveryFeeKobo: r.deliveryFeeKobo }
          const key = `${r.id}:${item.id}`
          const hit = base.find((l) => l.key === key)
          if (hit) return base.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
          return [...base, { key, restaurant: snapshot, itemId: item.id, name: item.name, priceKobo: item.priceKobo, qty: 1 }]
        })
      },
      setQty: (key, qty) => {
        setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))))
      },
      clear: () => setLines([]),
      profile,
      saveProfile: (p) => setProfile(p),
    }
  }, [area, lines, profile])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
