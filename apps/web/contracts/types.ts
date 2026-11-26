export * from "./errors";

// ── Purple Foods API contracts ─────────────────────────────────────
// Shared by api/ (server) and src/ (client). All money is KOBO as a
// plain number (₦2,800.00 → 280000). The DB stores bigint; the API
// boundary converts, and these DTOs are what the frontend ever sees.

export type OrderStatus =
  | "received"
  | "preparing"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "paystack" | "flutterwave";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface CityDto {
  id: string;
  name: string;
  state: string;
  /** City-centre coordinates (null only on legacy rows). */
  lat: number | null;
  lng: number | null;
}

export interface AreaDto {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  state: string;
  /** Zone-centre coordinates (null only on legacy rows). */
  lat: number | null;
  lng: number | null;
  baseDeliveryFeeKobo: number;
  etaMin: number;
  etaMax: number;
}

/** Result of matching a device geolocation to the closest delivery zone. */
export interface NearestAreaDto {
  area: AreaDto;
  /** Great-circle distance from the device to the zone centre, in km. */
  distanceKm: number;
}

export interface RestaurantDto {
  id: string;
  slug: string;
  name: string;
  areaId: string;
  areaName: string;
  tags: string[];
  promo: string | null;
  /** Effective values: merchant override, else the area default. */
  deliveryFeeKobo: number;
  etaMin: number;
  etaMax: number;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
}

export interface MenuOptionDto {
  id: string;
  name: string;
  priceKobo: number;
}

/** A "choose up to N" add-on group on a menu item (toppings, extras…). */
export interface MenuOptionGroupDto {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOptionDto[];
}

export interface MenuItemDto {
  id: string;
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  isSpicy: boolean;
  isPopular: boolean;
  /** Topping/add-on groups; empty when the item has none (and in the
   *  flat search index, where groups are loaded via the restaurant). */
  optionGroups: MenuOptionGroupDto[];
}

export interface RestaurantDetailDto extends RestaurantDto {
  menu: MenuItemDto[];
}

export interface OrderItemOptionDto {
  group: string;
  name: string;
  priceKobo: number;
}

export interface OrderItemDto {
  name: string;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
  /** Snapshot of the toppings chosen at order time. */
  options: OrderItemOptionDto[];
  note: string;
  allergy: string;
  cutlery: boolean;
}

export interface OrderDto {
  id: string;
  humanRef: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  placedAt: string;
  merchantName: string;
  merchantSlug: string;
  deliveryName: string;
  deliveryPhone: string;
  deliveryStreet: string;
  deliveryNotes: string;
  deliveryAreaName: string;
  /** Kitchen coordinates — powers the live tracking map (nullable on
   *  legacy rows). */
  merchantLat: number | null;
  merchantLng: number | null;
  /** Delivery-zone centre coordinates — the customer pin on the map. */
  deliveryAreaLat: number | null;
  deliveryAreaLng: number | null;
  items: OrderItemDto[];
}

export interface CreateOrderResult {
  orderId: string;
  humanRef: string;
  totalKobo: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}

// ── Auth (phone OTP · email+password · Google) ─────────────────────

export interface SessionUserDto {
  id: string;
  /** Null until the customer adds a phone (email/Google sign-ups). */
  phone: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: "customer" | "rider" | "merchant" | "admin";
}

export interface RequestOtpResult {
  ok: boolean;
  ttlMinutes: number;
  /** Present only when no SMS provider is configured (dev/testing). */
  devCode?: string;
}

/** Returned by every successful sign-in method (OTP, email, Google). */
export interface AuthResult {
  token: string;
  expiresAt: string;
  user: SessionUserDto;
}

// ── Customer data stores ───────────────────────────────────────────

export interface AddressDto {
  id: string;
  label: string;
  street: string;
  areaId: string;
  areaName: string;
  notes: string;
  isDefault: boolean;
}

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  kind: "order" | "promo" | "info";
  readAt: string | null;
  createdAt: string;
}

/** A menu item flattened with its restaurant — used by search. */
export interface MenuItemSearchDto extends MenuItemDto {
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
}
