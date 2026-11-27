import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedQuery, publicQuery } from "./middleware";
import {
  getRestaurantBySlug,
  listAllMenuItems,
  listAreas,
  listCities,
  listRestaurants,
  nearestArea,
} from "./queries/catalog";
import { createOrder, listOrdersByUser, confirmDelivery } from "./queries/orders";
import {
  loginWithEmail,
  loginWithFacebook,
  loginWithGoogle,
  registerWithEmail,
  requestOtp,
  revokeSession,
  updateAvatar,
  updateProfile,
  verifyOtp,
} from "./queries/auth";
import {
  chargeSavedCard,
  getBankTransferForOrder,
  initializePaystack,
  listCards,
  listTransactions,
  markBankTransferSent,
  removeCard,
  setDefaultCard,
  verifyPaystack,
} from "./queries/payments";
import { reverseGeocode, searchAddress } from "./queries/geo";
import { assistantChat } from "./queries/assistant";
import { env } from "./lib/env";
import {
  checkPromo,
  ensureReferralCode,
  listActivePromos,
} from "./queries/promos";
import { listMerchantReviews, submitReview } from "./queries/reviews";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  listFavoriteIds,
  listFavorites,
  listNotifications,
  markAllNotificationsRead,
  setDefaultAddress,
  toggleFavorite,
} from "./queries/account";

const catalogRouter = createRouter({
  areas: publicQuery.query(() => listAreas()),

  cities: publicQuery.query(() => listCities()),

  // Device geolocation → closest active delivery zone (haversine).
  nearestArea: publicQuery
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .query(async ({ input }) => {
      const match = await nearestArea(input.lat, input.lng);
      if (!match) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No delivery zones are available yet.",
        });
      }
      return match;
    }),

  restaurants: publicQuery
    .input(z.object({ areaId: z.string().uuid().optional() }).optional())
    .query(({ input }) => listRestaurants(input?.areaId)),

  // All available menu items across listed merchants — search + item pages.
  items: publicQuery.query(() => listAllMenuItems()),

  restaurant: publicQuery
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      const restaurant = await getRestaurantBySlug(input.slug);
      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found.",
        });
      }
      return restaurant;
    }),
});

const ordersRouter = createRouter({
  // Signed-in customers only: checkout redirects guests to /auth first.
  create: protectedQuery
    .input(
      z.object({
        customerName: z.string().min(1).max(120),
        customerPhone: z.string().min(7).max(20),
        street: z.string().min(1).max(300),
        notes: z.string().max(500).default(""),
        areaId: z.string().uuid(),
        merchantSlug: z.string().min(1).max(80),
        paymentMethod: z.enum(["cod", "paystack", "flutterwave", "bank_transfer"]),
        promoCode: z.string().max(40).default(""),
        receiverName: z.string().max(120).default(""),
        receiverPhone: z.string().max(20).default(""),
        scheduledFor: z.string().max(40).nullable().default(null),
        deliveryLat: z.number().min(-90).max(90).nullable().default(null),
        deliveryLng: z.number().min(-180).max(180).nullable().default(null),
        items: z
          .array(
            z.object({
              menuItemId: z.string().uuid(),
              quantity: z.number().int().min(1).max(20),
              optionIds: z.array(z.string().uuid()).max(20).default([]),
              note: z.string().max(300).default(""),
              allergy: z.string().max(200).default(""),
              cutlery: z.boolean().default(false),
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(({ input, ctx }) => createOrder(input, ctx.user)),

  // Signed-in customers only — orders are private to the session identity.
  mine: protectedQuery.query(({ ctx }) => listOrdersByUser(ctx.user.id)),

  // Customer closes the loop when the food arrives (settles COD, unlocks
  // the review prompt).
  confirmDelivery: protectedQuery
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(({ input, ctx }) => confirmDelivery(ctx.user.id, input.orderId)),
});

const authRouter = createRouter({
  // Phone OTP
  requestOtp: publicQuery
    .input(z.object({ phone: z.string().min(7).max(20) }))
    .mutation(({ input }) => requestOtp(input.phone)),

  verifyOtp: publicQuery
    .input(
      z.object({
        phone: z.string().min(7).max(20),
        code: z.string().min(4).max(8),
      }),
    )
    .mutation(({ input }) => verifyOtp(input.phone, input.code)),

  // Email + password
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(120),
        email: z.string().max(160),
        phone: z.string().min(7).max(20),
        password: z.string().min(8).max(200),
      }),
    )
    .mutation(({ input }) => registerWithEmail(input)),

  loginEmail: publicQuery
    .input(
      z.object({
        email: z.string().max(160),
        password: z.string().min(1).max(200),
      }),
    )
    .mutation(({ input }) => loginWithEmail(input.email, input.password)),

  // Google Identity Services ID token
  google: publicQuery
    .input(z.object({ idToken: z.string().min(20).max(4096) }))
    .mutation(({ input }) => loginWithGoogle(input.idToken)),

  // Facebook Login user access token (verified via debug_token)
  facebook: publicQuery
    .input(z.object({ accessToken: z.string().min(20).max(4096) }))
    .mutation(({ input }) => loginWithFacebook(input.accessToken)),

  updateProfile: protectedQuery
    .input(
      z.object({
        name: z.string().min(2).max(120).optional(),
        phone: z.string().min(7).max(20).optional(),
      }),
    )
    .mutation(({ input, ctx }) => updateProfile(ctx.user.id, input)),

  // Profile photo as a data URL (client pre-resizes to 256×256).
  updateAvatar: protectedQuery
    .input(z.object({ dataUrl: z.string().max(120_000) }))
    .mutation(({ input, ctx }) => updateAvatar(ctx.user.id, input.dataUrl)),

  me: protectedQuery.query(({ ctx }) => ctx.user),

  logout: publicQuery.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) await revokeSession(ctx.sessionToken);
    return { ok: true };
  }),
});

const addressesRouter = createRouter({
  list: protectedQuery.query(({ ctx }) => listAddresses(ctx.user.id)),

  create: protectedQuery
    .input(
      z.object({
        label: z.string().min(1).max(40),
        street: z.string().min(5).max(300),
        areaId: z.string().uuid(),
        notes: z.string().max(300).default(""),
        isDefault: z.boolean().default(false),
        lat: z.number().min(-90).max(90).nullable().default(null),
        lng: z.number().min(-180).max(180).nullable().default(null),
      }),
    )
    .mutation(({ input, ctx }) => createAddress(ctx.user.id, input)),

  remove: protectedQuery
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => deleteAddress(ctx.user.id, input.id)),

  setDefault: protectedQuery
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => setDefaultAddress(ctx.user.id, input.id)),
});

const favoritesRouter = createRouter({
  list: protectedQuery.query(({ ctx }) => listFavorites(ctx.user.id)),
  ids: protectedQuery.query(({ ctx }) => listFavoriteIds(ctx.user.id)),

  toggle: protectedQuery
    .input(z.object({ merchantId: z.string().uuid() }))
    .mutation(({ input, ctx }) => toggleFavorite(ctx.user.id, input.merchantId)),
});

const notificationsRouter = createRouter({
  list: protectedQuery.query(({ ctx }) => listNotifications(ctx.user.id)),
  markAllRead: protectedQuery.mutation(({ ctx }) =>
    markAllNotificationsRead(ctx.user.id),
  ),
});

const paymentsRouter = createRouter({
  cards: protectedQuery.query(({ ctx }) => listCards(ctx.user.id)),

  removeCard: protectedQuery
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => removeCard(ctx.user.id, input.id)),

  setDefaultCard: protectedQuery
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => setDefaultCard(ctx.user.id, input.id)),

  transactions: protectedQuery.query(({ ctx }) =>
    listTransactions(ctx.user.id),
  ),

  // Gateway availability so checkout can enable/disable card options.
  config: publicQuery.query(() => ({
    paystackEnabled: !!env.paystackSecretKey,
    // Manual account works with zero setup once BANK_* env vars exist;
    // Paystack mode activates automatically when the secret key lands.
    bankTransferEnabled: !!(env.bankAccountNumber || env.paystackSecretKey),
  })),

  // Bank-transfer instruction for an order the customer owns.
  bankTransfer: protectedQuery
    .input(z.object({ orderId: z.string().uuid() }))
    .query(({ input, ctx }) =>
      getBankTransferForOrder(ctx.user.id, input.orderId),
    ),

  // Customer tapped "I've sent it" — staff confirms on the admin side.
  markTransferSent: protectedQuery
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(({ input, ctx }) =>
      markBankTransferSent(ctx.user.id, input.orderId),
    ),

  // Start a Paystack hosted checkout for an unpaid order. The client
  // passes its origin so the gateway can redirect back into the app.
  initialize: protectedQuery
    .input(
      z.object({
        orderId: z.string().uuid(),
        callbackBase: z.string().url().max(200),
      }),
    )
    .mutation(({ input, ctx }) =>
      initializePaystack({
        userId: ctx.user.id,
        orderId: input.orderId,
        callbackBase: input.callbackBase,
      }),
    ),

  // After the gateway redirects back: confirm the charge server-side.
  verify: protectedQuery
    .input(z.object({ reference: z.string().min(6).max(80) }))
    .mutation(({ input, ctx }) => verifyPaystack(ctx.user.id, input.reference)),

  // One-tap charge on a saved card.
  chargeCard: protectedQuery
    .input(
      z.object({
        cardId: z.string().uuid(),
        orderId: z.string().uuid(),
      }),
    )
    .mutation(({ input, ctx }) =>
      chargeSavedCard({
        userId: ctx.user.id,
        cardId: input.cardId,
        orderId: input.orderId,
      }),
    ),
});

const promosRouter = createRouter({
  // Active store codes for the Promos page.
  list: publicQuery.query(() => listActivePromos()),

  // Estimate a code against the current cart (display only — the order
  // mutation re-validates authoritatively).
  check: protectedQuery
    .input(
      z.object({
        code: z.string().min(3).max(40),
        subtotalKobo: z.number().int().min(0),
        deliveryFeeKobo: z.number().int().min(0),
      }),
    )
    .query(({ input, ctx }) =>
      checkPromo(ctx.user.id, input.code, input.subtotalKobo, input.deliveryFeeKobo),
    ),

  // Lazily mints the signed-in customer's referral code.
  myReferral: protectedQuery.query(({ ctx }) => ensureReferralCode(ctx.user.id)),
});

const reviewsRouter = createRouter({
  submit: protectedQuery
    .input(
      z.object({
        orderId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).default(""),
      }),
    )
    .mutation(({ input, ctx }) =>
      submitReview({
        userId: ctx.user.id,
        orderId: input.orderId,
        rating: input.rating,
        comment: input.comment,
      }),
    ),

  forMerchant: publicQuery
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(({ input }) => listMerchantReviews(input.slug)),
});

// Geocoding proxy — Nominatim needs a User-Agent and no CORS, so the
// browser always talks to us and we talk to OSM (with a 10-min cache).
const geoRouter = createRouter({
  search: publicQuery
    .input(z.object({ query: z.string().min(3).max(200) }))
    .query(({ input }) => searchAddress(input.query)),

  reverse: publicQuery
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .query(({ input }) => reverseGeocode(input.lat, input.lng)),
});

// Purple — the in-app AI assistant. Public (guests can ask too); the
// engine falls back to the built-in intent matcher when no LLM key is
// configured, so it works from day one.
const assistantRouter = createRouter({
  chat: publicQuery
    .input(
      z.object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(1000),
            }),
          )
          .min(1)
          .max(30),
        areaName: z.string().max(80).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      assistantChat({
        messages: input.messages,
        areaName: input.areaName,
        signedIn: !!ctx.user,
      }),
    ),
});

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  catalog: catalogRouter,
  orders: ordersRouter,
  auth: authRouter,
  addresses: addressesRouter,
  favorites: favoritesRouter,
  notifications: notificationsRouter,
  payments: paymentsRouter,
  promos: promosRouter,
  geo: geoRouter,
  assistant: assistantRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
