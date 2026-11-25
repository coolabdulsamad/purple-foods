import type { MenuItemDto, RestaurantDto } from '@contracts/types'

export type { AreaDto, MenuItemDto, OrderDto, RestaurantDetailDto, RestaurantDto } from '@contracts/types'

/** A restaurant snapshot kept with the cart so totals render offline. */
export interface CartRestaurant {
  id: string
  slug: string
  name: string
  deliveryFeeKobo: number
}

export interface CartLine {
  key: string
  restaurant: CartRestaurant
  itemId: string
  name: string
  priceKobo: number
  qty: number
}

/** Delivery/profile details the customer typed — kept on-device until
 *  checkout sends them to the API (phone OTP auth lands in the auth phase). */
export interface Profile {
  name: string
  phone: string
  street: string
  notes: string
}

export interface SelectedArea {
  id: string
  name: string
}

export type AddableItem = MenuItemDto
export type AddableRestaurant = RestaurantDto

export const ORDER_STEPS = ['Received', 'Preparing', 'On the way', 'Delivered'] as const
