import type { MenuItemDto, RestaurantDto, SessionUserDto } from '@contracts/types'

export type {
  AddressDto,
  AreaDto,
  AuthResult,
  CityDto,
  MenuItemDto,
  MenuItemSearchDto,
  MenuOptionDto,
  MenuOptionGroupDto,
  NearestAreaDto,
  NotificationDto,
  OrderDto,
  OrderStatus,
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

/** A topping the customer picked on the item page. */
export interface CartOptionSelection {
  groupId: string
  groupName: string
  optionId: string
  name: string
  priceKobo: number
}

export interface CartLine {
  key: string
  restaurant: CartRestaurant
  itemId: string
  name: string
  /** Base menu price — toppings are added on top via `options`. */
  priceKobo: number
  qty: number
  /** Optional on lines stored before item customization shipped. */
  options?: CartOptionSelection[]
  cutlery?: boolean
  allergy?: string
  note?: string
  /** Dish photo path (e.g. /dishes/jollof.jpg) — absent on lines stored before photos shipped. */
  photoUrl?: string | null
}

/** Unit price of a cart line: base + selected toppings. */
export const cartLineUnitKobo = (l: CartLine): number =>
  l.priceKobo + (l.options ?? []).reduce((n, o) => n + o.priceKobo, 0)

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
  /** Optional for zones stored before the multi-city update. */
  cityName?: string
}

export type AddableItem = MenuItemDto
export type AddableRestaurant = RestaurantDto

export const ORDER_STEPS = ['Received', 'Preparing', 'On the way', 'Delivered'] as const
