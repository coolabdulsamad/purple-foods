import type { MenuItemDto, RestaurantDto, SessionUserDto } from '@contracts/types'

export type {
  AddressDto,
  AreaDto,
  AuthResult,
  MenuItemDto,
  MenuItemSearchDto,
  NotificationDto,
  OrderDto,
  RestaurantDetailDto,
  RestaurantDto,
  SessionUserDto,
} from '@contracts/types'

/** An active sign-in (phone OTP, email, or Google), persisted on-device. */
export interface Session {
  token: string
  expiresAt: string
  user: SessionUserDto
}

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
 *  checkout sends them to the API. */
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
