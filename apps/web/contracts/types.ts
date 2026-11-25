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

export interface AreaDto {
  id: string;
  name: string;
  baseDeliveryFeeKobo: number;
  etaMin: number;
  etaMax: number;
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

export interface MenuItemDto {
  id: string;
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  isSpicy: boolean;
  isPopular: boolean;
}

export interface RestaurantDetailDto extends RestaurantDto {
  menu: MenuItemDto[];
}

export interface OrderItemDto {
  name: string;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
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
  items: OrderItemDto[];
}

export interface CreateOrderResult {
  orderId: string;
  humanRef: string;
  totalKobo: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}
