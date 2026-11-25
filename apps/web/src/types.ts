export interface MenuItem {
  id: string
  name: string
  desc: string
  price: number
  category: string
  spicy?: boolean
  popular?: boolean
}

export interface Restaurant {
  id: string
  name: string
  area: string
  rating: number
  reviews: number
  etaMin: number
  etaMax: number
  deliveryFee: number
  promo?: string
  tags: string[]
  menu: MenuItem[]
}

export interface CartLine {
  key: string
  rid: string
  rname: string
  itemId: string
  name: string
  price: number
  qty: number
}

export interface OrderInput {
  name: string
  phone: string
  street: string
  area: string
  notes: string
  payment: string
}

export interface Order {
  id: string
  placedAt: number
  lines: CartLine[]
  subtotal: number
  deliveryFee: number
  total: number
  input: OrderInput
}

export const ORDER_STEPS = ['Received', 'Preparing', 'On the way', 'Delivered'] as const
