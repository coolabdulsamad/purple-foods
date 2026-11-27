import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type {
  AssistantActionDto,
  AssistantDishDto,
  AssistantMessageDto,
  AssistantReplyDto,
  AssistantRestaurantDto,
} from "@contracts/types";
import { areas, cities, merchants, menuItems, promoCodes } from "@db/schema";
import { env } from "../lib/env";
import { log } from "../lib/logger";
import { getDb } from "./connection";

// ── Purple — the Purple Foods assistant ────────────────────────────
// Two engines share one contract:
//   1. AI_API_KEY set → an OpenAI-compatible LLM (Moonshot/Kimi by
//      default) answers with function-calling over the live catalog.
//   2. No key → a built-in intent engine answers the same way, so the
//      assistant is fully working from day one and simply gets smarter
//      when the key lands.

const fmtN = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

// ── Catalog tool implementations ───────────────────────────────────

async function searchDishes(opts: {
  query?: string;
  maxPriceKobo?: number;
  areaName?: string;
  spicyOnly?: boolean;
  popularOnly?: boolean;
  limit?: number;
}): Promise<AssistantDishDto[]> {
  const db = getDb();
  const conds = [
    eq(menuItems.isAvailable, true),
    eq(merchants.isListed, true),
    eq(merchants.isApproved, true),
  ];
  if (opts.query) {
    const q = `%${opts.query}%`;
    conds.push(
      or(
        ilike(menuItems.name, q),
        ilike(menuItems.description, q),
        ilike(menuItems.category, q),
        ilike(merchants.name, q),
      )!,
    );
  }
  if (opts.maxPriceKobo != null) {
    conds.push(sql`${menuItems.priceKobo} <= ${BigInt(opts.maxPriceKobo)}`);
  }
  if (opts.areaName) conds.push(ilike(areas.name, `%${opts.areaName}%`));
  if (opts.spicyOnly) conds.push(eq(menuItems.isSpicy, true));
  if (opts.popularOnly) conds.push(eq(menuItems.isPopular, true));

  const rows = await db
    .select({ item: menuItems, merchant: merchants, area: areas })
    .from(menuItems)
    .innerJoin(merchants, eq(menuItems.merchantId, merchants.id))
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(and(...conds))
    .orderBy(desc(menuItems.isPopular), desc(merchants.rating), menuItems.priceKobo)
    .limit(Math.min(opts.limit ?? 8, 12));

  return rows.map(({ item, merchant, area }) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    priceKobo: Number(item.priceKobo),
    photoUrl: item.photoUrl,
    isSpicy: item.isSpicy,
    merchantSlug: merchant.slug,
    merchantName: merchant.name,
    deliveryFeeKobo: Number(merchant.deliveryFeeKobo ?? area.baseDeliveryFeeKobo),
    etaMin: merchant.etaMinMinutes ?? area.etaMinMinutes,
    etaMax: merchant.etaMaxMinutes ?? area.etaMaxMinutes,
  }));
}

async function findRestaurants(opts: {
  query?: string;
  areaName?: string;
  limit?: number;
}): Promise<AssistantRestaurantDto[]> {
  const db = getDb();
  const conds = [eq(merchants.isListed, true), eq(merchants.isApproved, true)];
  if (opts.query) {
    const q = `%${opts.query}%`;
    conds.push(
      or(
        ilike(merchants.name, q),
        ilike(areas.name, q),
        sql`EXISTS (SELECT 1 FROM unnest(${merchants.tags}) t WHERE t ILIKE ${q})`,
      )!,
    );
  }
  if (opts.areaName) conds.push(ilike(areas.name, `%${opts.areaName}%`));
  const rows = await db
    .select({ merchant: merchants, area: areas })
    .from(merchants)
    .innerJoin(areas, eq(merchants.areaId, areas.id))
    .where(and(...conds))
    .orderBy(desc(merchants.isOpen), desc(merchants.rating))
    .limit(Math.min(opts.limit ?? 6, 10));
  return rows.map(({ merchant: m, area: a }) => ({
    slug: m.slug,
    name: m.name,
    areaName: a.name,
    rating: Number(m.rating),
    etaMin: m.etaMinMinutes ?? a.etaMinMinutes,
    etaMax: m.etaMaxMinutes ?? a.etaMaxMinutes,
    deliveryFeeKobo: Number(m.deliveryFeeKobo ?? a.baseDeliveryFeeKobo),
    coverUrl: m.coverUrl,
    logoUrl: m.logoUrl,
    tags: m.tags,
  }));
}

async function listPromosText(): Promise<string> {
  const db = getDb();
  const rows = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.isActive, true))
    .orderBy(promoCodes.code)
    .limit(10);
  if (!rows.length) return "No public promo codes right now.";
  return rows
    .map((p) => {
      const what =
        p.kind === "percent"
          ? `${p.percentOff}% off`
          : p.kind === "free_delivery"
            ? "free delivery"
            : `${fmtN(Number(p.valueKobo ?? 0))} off`;
      return `${p.code} — ${what} (min order ${fmtN(Number(p.minOrderKobo))})`;
    })
    .join("; ");
}

async function listAreasText(): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ area: areas, city: cities })
    .from(areas)
    .innerJoin(cities, eq(areas.cityId, cities.id))
    .where(eq(areas.isActive, true))
    .orderBy(cities.name, areas.name);
  const byCity = new Map<string, string[]>();
  for (const { area, city } of rows) {
    const list = byCity.get(city.name) ?? [];
    list.push(area.name);
    byCity.set(city.name, list);
  }
  return Array.from(byCity.entries())
    .map(([city, zs]) => `${city}: ${zs.join(", ")}`)
    .join(" | ");
}

// ── LLM engine (OpenAI-compatible function calling) ────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_dishes",
      description:
        "Search real dishes on Purple Foods. Use for any food recommendation, budget question or dish lookup. Prices are naira.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Food keyword, e.g. jollof, burger, suya, shake" },
          max_price_naira: { type: "number", description: "Only dishes at or under this naira price" },
          area: { type: "string", description: "Delivery zone name, e.g. Jabi, Wuse 2" },
          spicy_only: { type: "boolean" },
          popular_only: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_restaurants",
      description: "Find restaurants/kitchens by name, cuisine tag or area.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          area: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_promos",
      description: "List the currently active promo codes.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_delivery_areas",
      description: "List the cities and zones Purple Foods delivers to.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are Purple, the friendly AI assistant inside Purple Foods — a Nigerian food delivery website (Abuja is live; Lagos, Enugu, Kano, Port Harcourt and Ibadan zones are listed as launching soon).

What you can do:
- Recommend real dishes and restaurants using the tools (ALWAYS call a tool for anything about food, prices, budgets, restaurants or promos — never invent menu items, prices or codes).
- Answer questions about the service: cash on delivery, card via Paystack, bank transfer at checkout, scheduled deliveries, send-to-someone orders, promos/referrals, favorites, order tracking.
- Guide the customer around the app: Home /, Restaurants /restaurants, Search /search, Cart /cart, Orders /orders, Promos /promos, Addresses /account/addresses, Account /account, Help /help, a restaurant /r/<slug>, a category /category/<Name>.

Style: warm, concise (2–5 short sentences), Nigeria-friendly. Quote money in naira with the ₦ sign. When you recommend dishes, name the top 1–3 with prices and say the cards below can be added straight to the cart. If a budget is too small for anything, say the cheapest real option instead of pretending. If asked something outside food delivery, answer briefly and steer back to food.`;

interface CollectedCards {
  dishes: AssistantDishDto[];
  restaurants: AssistantRestaurantDto[];
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  cards: CollectedCards,
): Promise<string> {
  if (name === "search_dishes") {
    const dishes = await searchDishes({
      query: typeof args.query === "string" ? args.query : undefined,
      maxPriceKobo:
        typeof args.max_price_naira === "number" ? Math.round(args.max_price_naira * 100) : undefined,
      areaName: typeof args.area === "string" ? args.area : undefined,
      spicyOnly: args.spicy_only === true,
      popularOnly: args.popular_only === true,
      limit: typeof args.limit === "number" ? args.limit : 8,
    });
    const seen = new Set(cards.dishes.map((d) => d.id));
    for (const d of dishes) if (!seen.has(d.id) && cards.dishes.length < 6) cards.dishes.push(d);
    return dishes.length
      ? dishes.map((d) => `${d.name} — ${fmtN(d.priceKobo)} at ${d.merchantName}`).join("; ")
      : "No dishes matched.";
  }
  if (name === "find_restaurants") {
    const rs = await findRestaurants({
      query: typeof args.query === "string" ? args.query : undefined,
      areaName: typeof args.area === "string" ? args.area : undefined,
      limit: typeof args.limit === "number" ? args.limit : 6,
    });
    const seen = new Set(cards.restaurants.map((r) => r.slug));
    for (const r of rs) if (!seen.has(r.slug) && cards.restaurants.length < 4) cards.restaurants.push(r);
    return rs.length
      ? rs.map((r) => `${r.name} (${r.areaName}, ${r.rating.toFixed(1)}★, delivery ${fmtN(r.deliveryFeeKobo)})`).join("; ")
      : "No restaurants matched.";
  }
  if (name === "list_promos") return listPromosText();
  if (name === "list_delivery_areas") return listAreasText();
  return "Unknown tool.";
}

interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

/** Returns null when the LLM cannot answer (caller falls back). */
async function llmReply(
  history: AssistantMessageDto[],
  cards: CollectedCards,
): Promise<string | null> {
  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content }) as LlmMessage),
  ];
  try {
    for (let round = 0; round < 4; round++) {
      const res = await fetch(`${env.aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.aiApiKey}`,
        },
        body: JSON.stringify({
          model: env.aiModel,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.error("assistant LLM call failed", { status: res.status, body: body.slice(0, 300) });
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: LlmMessage }[];
      };
      const msg = data.choices?.[0]?.message;
      if (!msg) return null;
      messages.push(msg);
      if (!msg.tool_calls?.length) return (msg.content ?? "").trim() || null;
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          /* keep {} */
        }
        const result = await runTool(call.function.name, args, cards);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }
    return null;
  } catch (err) {
    log.error("assistant LLM error", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ── Built-in intent engine (no API key needed) ─────────────────────

const FOOD_WORDS = [
  "jollof", "fried rice", "rice", "burger", "suya", "shawarma", "pizza",
  "chicken", "turkey", "fish", "pepper soup", "soup", "egusi", "okra",
  "swallow", "amala", "eba", "fufu", "pounded", "semo", "grill", "bbq",
  "salad", "pasta", "noodle", "indomie", "drink", "juice", "shake",
  "smoothie", "chapman", "cake", "pastry", "meat pie", "meatpie", "beans",
  "porridge", "yam", "plantain", "bole", "akara", "moi moi", "moimoi",
  "bread", "sandwich", "wrap", "ice cream", "chops", "small chops",
  "wings", "peppered", "asun", "nkwobi", "isiewu", "abacha", "ofada",
];

function extractBudgetKobo(text: string): number | null {
  const m =
    /(?:under|below|within|less than|max(?:imum)?|budget(?: of)?|around|for)\s*(?:₦|ngn\s*|n\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i.exec(
      text,
    ) ?? /(?:₦|ngn\s*)(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i.exec(text);
  if (!m) return null;
  let naira = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(naira) || naira <= 0) return null;
  if (m[2]) naira *= 1000;
  // Bare "300" is almost certainly naira; "30" ambiguous — still treat
  // as naira when a budget word is present (first pattern anchored it).
  return Math.round(naira * 100);
}

function findFoodWord(text: string): string | null {
  const lower = text.toLowerCase();
  // Longest match first so "fried rice" beats "rice".
  const sorted = [...FOOD_WORDS].sort((a, b) => b.length - a.length);
  return sorted.find((w) => lower.includes(w)) ?? null;
}

function dishLine(d: AssistantDishDto): string {
  return `${d.name} (${fmtN(d.priceKobo)}) at ${d.merchantName}`;
}

async function fallbackReply(
  message: string,
  ctx: { areaName?: string; signedIn: boolean },
): Promise<AssistantReplyDto> {
  const text = message.toLowerCase();
  const empty: AssistantReplyDto = {
    reply: "",
    dishes: [],
    restaurants: [],
    actions: [],
    aiPowered: false,
  };

  // Order tracking
  if (/track|where.*order|my order|order status|delivery status/.test(text)) {
    return {
      ...empty,
      reply: ctx.signedIn
        ? "Your live orders are on the Orders page — each one shows its status timeline and the rider map when it's on the way."
        : "Sign in first and I'll keep every order on your Orders page, with live status and a tracking map while the rider is moving.",
      actions: ctx.signedIn
        ? [{ label: "Open my orders", path: "/orders" }]
        : [{ label: "Sign in", path: "/auth?next=/orders" }],
    };
  }

  // Promos & referrals
  if (/promo|discount|voucher|coupon|referral|free delivery|code/.test(text)) {
    const promos = await listPromosText();
    return {
      ...empty,
      reply: `Here are the live codes: ${promos}. Apply any of them at checkout — and your personal referral code on the Promos page earns you rewards when friends order.`,
      actions: [{ label: "See promos & my referral code", path: "/promos" }],
    };
  }

  // Delivery coverage / fees
  if (/where.*deliver|deliver.*(to|area|city)|coverage|cities|zones|delivery fee|how much.*delivery/.test(text)) {
    const zones = await listAreasText();
    return {
      ...empty,
      reply: `We're live in: ${zones}. Delivery fees show on every restaurant card and at checkout — pick your zone from the location button up top and fees follow it.`,
      actions: [{ label: "Browse restaurants", path: "/restaurants" }],
    };
  }

  // Payments
  if (/pay|payment|card|transfer|cash|bank/.test(text)) {
    return {
      ...empty,
      reply:
        "Three ways to pay at checkout: cash on delivery, card via Paystack (secured — we never see your card), or bank transfer, which gives you account details and a reference right after you place the order.",
      actions: [{ label: "Go to cart", path: "/cart" }],
    };
  }

  // Scheduling & gifting
  if (/schedule|later|tomorrow|gift|someone else|send to/.test(text)) {
    return {
      ...empty,
      reply:
        "At checkout you can schedule a delivery for later today or another day, and flip on “Send to someone else” to enter the receiver's name and phone — perfect for surprising somebody.",
      actions: [{ label: "Start an order", path: "/restaurants" }],
    };
  }

  // Restaurants
  if (/restaurant|places|kitchen|where can i order|best rated|top rated|open now/.test(text)) {
    const rs = await findRestaurants({ areaName: ctx.areaName, limit: 4 });
    if (rs.length) {
      return {
        ...empty,
        reply: `Top picks${ctx.areaName ? ` around ${ctx.areaName}` : ""}: ${rs
          .slice(0, 3)
          .map((r) => `${r.name} (${r.rating.toFixed(1)}★, ${r.areaName})`)
          .join(", ")}. Tap a card to open the menu.`,
        restaurants: rs,
        actions: [{ label: "All restaurants", path: "/restaurants" }],
      };
    }
  }

  // Account / sign-in
  if (/sign in|log ?in|account|profile|password/.test(text)) {
    return {
      ...empty,
      reply:
        "You can sign in with email + password, Google, Facebook, or a phone code — it takes seconds and unlocks saved addresses, one-tap checkout and order tracking.",
      actions: ctx.signedIn
        ? [{ label: "My account", path: "/account" }]
        : [{ label: "Sign in", path: "/auth" }],
    };
  }

  // Food request: keyword and/or budget
  const budget = extractBudgetKobo(message);
  const word = findFoodWord(text);
  const wantsFood =
    !!word || !!budget || /hungry|suggest|recommend|food|eat|crav|lunch|dinner|breakfast|cheap/.test(text);
  if (wantsFood) {
    const dishes = await searchDishes({
      query: word ?? undefined,
      maxPriceKobo: budget ?? undefined,
      areaName: ctx.areaName,
      limit: 6,
    });
    if (dishes.length) {
      const intro = budget
        ? `Within ${fmtN(budget)}${word ? ` for “${word}”` : ""}, here's what I'd go for:`
        : word
          ? `Craving ${word}? These are the best matches:`
          : "Here's what people are loving right now:";
      return {
        ...empty,
        reply: `${intro} ${dishes.slice(0, 3).map(dishLine).join("; ")}. Add straight from the cards below, or tap one to customize toppings.`,
        dishes,
        actions: [{ label: "Open full search", path: `/search${word ? `?q=${encodeURIComponent(word)}` : ""}` }],
      };
    }
    if (budget) {
      const cheapest = await searchDishes({ areaName: ctx.areaName, limit: 4 });
      if (cheapest.length) {
        return {
          ...empty,
          reply: `${fmtN(budget)} won't quite cover a full dish here — the closest options are ${cheapest
            .slice(0, 3)
            .map(dishLine)
            .join("; ")}. Top up a little and you're eating.`,
          dishes: cheapest,
          actions: [],
        };
      }
    }
    return {
      ...empty,
      reply: `I couldn't find that on the menus right now — try “jollof”, “suya”, “burger” or “shake”, or tell me a budget like “under ₦3,000”.`,
      actions: [{ label: "Search everything", path: "/search" }],
    };
  }

  // Greeting / default
  const popular = await searchDishes({ popularOnly: true, areaName: ctx.areaName, limit: 4 });
  return {
    ...empty,
    reply:
      "Hi, I'm Purple — your food assistant. Ask me things like “suggest food for me”, “what can I get under ₦3,000?”, “any suya near me?”, “promo codes”, or “track my order”. Here are popular picks to start:",
    dishes: popular,
    actions: [
      { label: "Browse restaurants", path: "/restaurants" },
      { label: "Search dishes", path: "/search" },
    ],
  };
}

// ── Entry point ────────────────────────────────────────────────────

export async function assistantChat(input: {
  messages: AssistantMessageDto[];
  areaName?: string;
  signedIn: boolean;
}): Promise<AssistantReplyDto> {
  const last = input.messages[input.messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return {
      reply: "Ask me anything about food, your orders or how Purple Foods works.",
      dishes: [],
      restaurants: [],
      actions: [],
      aiPowered: false,
    };
  }

  const cards: CollectedCards = { dishes: [], restaurants: [] };
  if (env.aiApiKey) {
    const reply = await llmReply(input.messages.slice(-10), cards);
    if (reply) {
      const actions: AssistantActionDto[] = [];
      if (cards.restaurants.length === 1) {
        actions.push({ label: `Open ${cards.restaurants[0]!.name}`, path: `/r/${cards.restaurants[0]!.slug}` });
      }
      if (cards.dishes.length && !cards.restaurants.length) {
        actions.push({ label: "Open search", path: "/search" });
      }
      return { reply, dishes: cards.dishes, restaurants: cards.restaurants, actions, aiPowered: true };
    }
    // LLM unreachable — the built-in engine still answers.
    log.info("assistant falling back to built-in engine");
  }
  return fallbackReply(last.content, {
    areaName: input.areaName,
    signedIn: input.signedIn,
  });
}
