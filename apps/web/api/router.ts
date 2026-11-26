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
import { createOrder, listOrdersByUser } from "./queries/orders";
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  requestOtp,
  revokeSession,
  updateProfile,
  verifyOtp,
} from "./queries/auth";
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
        paymentMethod: z.enum(["cod", "paystack", "flutterwave"]),
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

  updateProfile: protectedQuery
    .input(
      z.object({
        name: z.string().min(2).max(120).optional(),
        phone: z.string().min(7).max(20).optional(),
      }),
    )
    .mutation(({ input, ctx }) => updateProfile(ctx.user.id, input)),

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

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  catalog: catalogRouter,
  orders: ordersRouter,
  auth: authRouter,
  addresses: addressesRouter,
  favorites: favoritesRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
