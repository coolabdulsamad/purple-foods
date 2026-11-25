import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { findRestaurant } from './data'
import type { CartLine, MenuItem, Order, OrderInput, Restaurant } from './types'

interface StoreShape {
  area: string
  setArea: (a: string) => void
  lines: CartLine[]
  count: number
  subtotal: number
  deliveryFee: number
  total: number
  add: (item: MenuItem, r: Restaurant) => void
  setQty: (key: string, qty: number) => void
  clear: () => void
  orders: Order[]
  placeOrder: (input: OrderInput) => Order | null
  userName: string | null
  signIn: (name: string) => void
  signOut: () => void
}

const StoreCtx = createContext<StoreShape | null>(null)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<string>(() => read('pf-area', 'Victoria Island'))
  const [lines, setLines] = useState<CartLine[]>(() => read('pf-cart', []))
  const [orders, setOrders] = useState<Order[]>(() => read('pf-orders', []))
  const [userName, setUserName] = useState<string | null>(() => read('pf-user', null))

  useEffect(() => localStorage.setItem('pf-area', JSON.stringify(area)), [area])
  useEffect(() => localStorage.setItem('pf-cart', JSON.stringify(lines)), [lines])
  useEffect(() => localStorage.setItem('pf-orders', JSON.stringify(orders)), [orders])
  useEffect(() => localStorage.setItem('pf-user', JSON.stringify(userName)), [userName])

  const value = useMemo<StoreShape>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
    const deliveryFee = lines.length ? (findRestaurant(lines[0].rid)?.deliveryFee ?? 900) : 0
    return {
      area,
      setArea,
      lines,
      count,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      add: (item, r) => {
        setLines((prev) => {
          const foreign = prev.find((l) => l.rid !== r.id)
          const base = foreign ? [] : prev
          if (foreign) toast.info(`Cart switched to ${r.name}`, { description: 'One restaurant per order — previous items cleared.' })
          const key = `${r.id}:${item.id}`
          const hit = base.find((l) => l.key === key)
          if (hit) return base.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
          return [...base, { key, rid: r.id, rname: r.name, itemId: item.id, name: item.name, price: item.price, qty: 1 }]
        })
      },
      setQty: (key, qty) => {
        setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))))
      },
      clear: () => setLines([]),
      orders,
      placeOrder: (input) => {
        if (!lines.length) return null
        const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
        const fee = deliveryFee
        const order: Order = {
          id: `PF-${String(Math.floor(1000 + Math.random() * 9000))}`,
          placedAt: Date.now(),
          lines,
          subtotal,
          deliveryFee: fee,
          total: subtotal + fee,
          input,
        }
        setOrders((prev) => [order, ...prev])
        setLines([])
        return order
      },
      userName,
      signIn: (name) => setUserName(name),
      signOut: () => setUserName(null),
    }
  }, [area, lines, orders, userName])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
