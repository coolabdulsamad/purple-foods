import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import {
  getRestaurantBySlug,
  listAreas,
  listRestaurants,
} from "./queries/catalog";
import { createOrder, listOrdersByPhone } from "./queries/orders";

const catalogRouter = createRouter({
  areas: publicQuery.query(() => listAreas()),

  restaurants: publicQuery.query(() => listRestaurants()),

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
  create: publicQuery
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
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(({ input }) => createOrder(input)),

  mine: publicQuery
    .input(z.object({ phone: z.string().min(7).max(20) }))
    .query(({ input }) => listOrdersByPhone(input.phone)),
});

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  catalog: catalogRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
