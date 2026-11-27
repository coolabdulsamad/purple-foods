/**
 * Page-guide content — one entry per route. The floating "?" button reads
 * this map to explain the page the customer is currently on: what it is for
 * and what every button/control does. Pure data, no network — instant even
 * on a flaky connection.
 */

export interface GuideItem {
  name: string
  does: string
}

export interface GuideSection {
  heading: string
  items: GuideItem[]
}

export interface PageGuideEntry {
  title: string
  intro: string
  sections: GuideSection[]
}

/** Appended to every page — the floating buttons themselves. */
export const FLOAT_TOOLS: GuideSection = {
  heading: 'Floating tools — on every page',
  items: [
    { name: 'Home pill', does: 'Takes you straight back to the Home page, from any page.' },
    { name: '? button', does: 'Opens this guide — a tour of whatever page you are on.' },
    { name: 'Purple ✦ button', does: 'Opens the AI assistant. Ask it to suggest food, find dishes within a budget, explain promos — anything.' },
  ],
}

const HEADER_TOOLS: GuideSection = {
  heading: 'Top bar',
  items: [
    { name: 'PurpleFoods logo', does: 'Tap it any time to return Home.' },
    { name: 'Location pill', does: 'Shows your delivery zone. Tap to change area or pick another city.' },
    { name: 'Search field', does: 'Jumps to Search so you can find any dish or restaurant.' },
    { name: 'Bell icon', does: 'Your notifications — order updates, promos and alerts. A badge means unread.' },
    { name: 'Cart pill', does: 'Opens your cart. The number shows how many items are in it.' },
    { name: 'Avatar / Sign in', does: 'Your account menu when signed in, or the Sign in / Sign up buttons when not.' },
  ],
}

const HOME: PageGuideEntry = {
  title: 'Home page',
  intro: 'Your starting point — restaurants near your chosen zone, categories, and today’s top picks.',
  sections: [
    HEADER_TOOLS,
    {
      heading: 'On this page',
      items: [
        { name: 'Category chips', does: 'Filter the feed by cuisine — grills, soups, burgers and more.' },
        { name: 'Restaurant cards', does: 'Tap any card to open that restaurant’s menu. The pill on the photo shows delivery time; below it you see rating, area and delivery fee.' },
        { name: 'Location dialog', does: 'Pops up on your first visit so we show restaurants that actually deliver to you.' },
      ],
    },
  ],
}

const RESTAURANTS: PageGuideEntry = {
  title: 'Restaurants page',
  intro: 'Every restaurant on Purple Foods, in your delivery zone first.',
  sections: [
    HEADER_TOOLS,
    {
      heading: 'On this page',
      items: [
        { name: 'Restaurant cards', does: 'Photo, logo, rating, delivery time and fee. Tap a card to open the full menu.' },
        { name: 'CLOSED badge', does: 'Means the kitchen is offline right now — you can look, but not order.' },
        { name: 'Promo pill', does: 'A saffron label on the photo means that restaurant has an active deal.' },
      ],
    },
  ],
}

const RESTAURANT: PageGuideEntry = {
  title: 'Restaurant page',
  intro: 'One restaurant’s full menu, info and customer reviews.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Info card', does: 'Logo, name, rating, delivery time and fee — the three pills under the name.' },
        { name: 'Heart icon', does: 'Saves the restaurant to your Favorites.' },
        { name: 'Menu groups', does: 'Dishes grouped by category. Tap a dish to see toppings and details.' },
        { name: 'ADD button', does: 'Adds the dish straight to your cart. CUSTOMIZE means the dish has toppings — tap to choose them first.' },
        { name: 'Reviews', does: 'Real ratings from customers who ordered here.' },
        { name: 'Cart pill (bottom)', does: 'Appears once you add food — shows the total and takes you to your cart.' },
      ],
    },
  ],
}

const ITEM: PageGuideEntry = {
  title: 'Dish details page',
  intro: 'Build your plate exactly how you want it before adding it to the cart.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Topping groups', does: 'Extras like protein or sides. PICK N = required, CHOOSE UP TO N = optional limit.' },
        { name: 'Cutlery toggle', does: 'We include a fork/spoon pack with this dish.' },
        { name: 'Allergy field', does: 'Tell the kitchen what to avoid — they see it with your order.' },
        { name: 'Note field', does: 'Anything else: “extra pepper”, “no onions”…' },
        { name: 'Quantity stepper', does: 'How many plates. The price updates live.' },
        { name: 'Add to cart', does: 'Saves your configured plate. Editing from the cart brings you back here with everything pre-filled.' },
      ],
    },
  ],
}

const CATEGORY: PageGuideEntry = {
  title: 'Category page',
  intro: 'All restaurants serving one kind of food — grills, soups, pastries and so on.',
  sections: [
    HEADER_TOOLS,
    {
      heading: 'On this page',
      items: [
        { name: 'Restaurant cards', does: 'Every kitchen in this category. Tap one to open its menu.' },
      ],
    },
  ],
}

const SEARCH: PageGuideEntry = {
  title: 'Search page',
  intro: 'Find any dish or restaurant across the whole platform.',
  sections: [
    HEADER_TOOLS,
    {
      heading: 'On this page',
      items: [
        { name: 'Search field', does: 'Type a dish (“suya”, “jollof”) or a restaurant name — results appear as you type.' },
        { name: 'Suggestion chips', does: 'One-tap popular searches.' },
        { name: 'Restaurants results', does: 'Matching kitchens — tap to open the menu.' },
        { name: 'Dishes results', does: 'Matching dishes with prices — tap to open and customize.' },
        { name: 'Popular dishes', does: 'Shown before you type — the most ordered plates right now.' },
      ],
    },
  ],
}

const CART: PageGuideEntry = {
  title: 'Cart page',
  intro: 'Everything you are about to order, from one restaurant at a time.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Cart lines', does: 'Tap a dish to edit its toppings, notes and quantity.' },
        { name: '+ / − steppers', does: 'Change quantities. Reaching zero removes the dish.' },
        { name: 'Summary card', does: 'Subtotal, delivery fee and total — all in naira.' },
        { name: 'Checkout button', does: 'Takes you to delivery details and payment. Your cart is saved on this device even if you sign in midway.' },
      ],
    },
  ],
}

const CHECKOUT: PageGuideEntry = {
  title: 'Checkout page',
  intro: 'Five short steps: address, your details, gifting, timing, promo — then pay.',
  sections: [
    {
      heading: 'Step 1 — Delivery address',
      items: [
        { name: 'Saved address cards', does: 'Tap one to fill everything instantly. The DEFAULT badge is your main address.' },
        { name: 'Street + zone fields', does: 'Type a new address manually if you prefer.' },
        { name: 'Live map', does: 'Search an address or drop the pin exactly where the rider should stop — the delivery zone snaps automatically.' },
      ],
    },
    {
      heading: 'Steps 2–5',
      items: [
        { name: 'Your details', does: 'Who the rider calls on arrival. Signed-in numbers stay pinned for safety.' },
        { name: 'Send to someone', does: 'Flip the switch to gift the order — fill in the receiver’s name and phone.' },
        { name: 'Delivery time', does: '“Deliver now”, or “Schedule it” to pick a future date and time.' },
        { name: 'Promo code', does: 'Apply WELCOME500, PURPLE10 and friends — the discount shows instantly.' },
      ],
    },
    {
      heading: 'Payment + summary',
      items: [
        { name: 'Bank transfer', does: 'We generate account details and a unique reference — transfer from any bank app.' },
        { name: 'Card via Paystack', does: 'Pay securely by card; saved cards give one-tap checkout.' },
        { name: 'Cash on delivery', does: 'The rider collects when the food arrives.' },
        { name: 'Place order button', does: 'Writes your order to the live system and takes you to tracking.' },
      ],
    },
  ],
}

const ORDERS: PageGuideEntry = {
  title: 'Orders page',
  intro: 'Every order you have placed — active ones first.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Order cards', does: 'Reference, restaurant, total and status pill. Tap one for live tracking.' },
        { name: 'Status pills', does: 'Pending → Preparing → On the way → Delivered. Cancelled shows in red.' },
      ],
    },
  ],
}

const TRACKING: PageGuideEntry = {
  title: 'Order tracking page',
  intro: 'Follow one order from the kitchen flame to your doorstep.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Stepper', does: 'The live stage of your order — it refreshes itself every few seconds.' },
        { name: 'Map', does: 'Restaurant, rider and your drop-off pin on a real map.' },
        { name: 'Bank transfer card', does: 'If you chose transfer: the account number, bank, exact amount and your unique reference live here, with copy buttons.' },
        { name: 'I’ve sent it', does: 'Tap after transferring so we match your payment faster.' },
        { name: 'Receiver / schedule cards', does: 'Shown when the order is a gift or was scheduled ahead.' },
        { name: 'Review stars', does: 'After delivery, rate the food — one review per order.' },
        { name: 'Confirm delivery', does: 'For cash orders — confirms handover and settles the payment.' },
      ],
    },
  ],
}

const ORDER_SUCCESS: PageGuideEntry = {
  title: 'Order success page',
  intro: 'Your order is in — the kitchen has it.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Order reference', does: 'Your PF-XXXX code — quote it if you contact support.' },
        { name: 'Track order', does: 'Opens live tracking for this order.' },
      ],
    },
  ],
}

const ACCOUNT: PageGuideEntry = {
  title: 'Account page',
  intro: 'Your profile and every self-service tool in one place.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Identity card', does: 'Your photo, name and phone. The pencil opens Edit profile.' },
        { name: 'Edit profile', does: 'Change your name, phone and profile photo.' },
        { name: 'Saved addresses', does: 'Your address book with maps — home, work, anywhere.' },
        { name: 'Payment cards', does: 'Cards saved via Paystack for one-tap checkout.' },
        { name: 'Transactions', does: 'Every payment you have made, newest first.' },
        { name: 'Favorites', does: 'Restaurants you hearted.' },
        { name: 'Notifications', does: 'Order updates and promos.' },
        { name: 'Promos & referrals', does: 'Discount codes and your personal referral code.' },
        { name: 'Help & support', does: 'FAQs and how to reach us.' },
        { name: 'Sign out', does: 'Ends this session on this device.' },
      ],
    },
  ],
}

const EDIT_PROFILE: PageGuideEntry = {
  title: 'Edit profile page',
  intro: 'Update your name, phone and profile photo.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Camera button', does: 'Tap to upload a profile photo — it is cropped to a neat circle and also shows in the top bar.' },
        { name: 'Name / phone fields', does: 'Edit and save. The phone on a signed-in account is your identity.' },
        { name: 'Save button', does: 'Writes the changes to your account immediately.' },
      ],
    },
  ],
}

const ADDRESSES: PageGuideEntry = {
  title: 'Saved addresses page',
  intro: 'Your address book — each entry with its own mini map.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Address cards', does: 'Label, street, zone and a mini map. Star sets the default, trash deletes.' },
        { name: 'Add address', does: 'Opens the editor: type the street, then search or drop the pin on the real map so riders find the exact spot.' },
        { name: 'Label chips', does: 'Home, Work or Other — pick how the address appears at checkout.' },
      ],
    },
  ],
}

const PAYMENTS: PageGuideEntry = {
  title: 'Payment cards page',
  intro: 'Cards you saved at checkout for one-tap payment next time.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Card rows', does: 'Brand, last four digits, bank and expiry. Cards are stored by Paystack — we never see the full number.' },
        { name: 'Set default', does: 'The default card is pre-selected at checkout.' },
        { name: 'Remove', does: 'Deletes the saved card instantly.' },
        { name: 'Add a card', does: 'Happens at checkout: pay once with a new card and it is saved for next time.' },
      ],
    },
  ],
}

const TRANSACTIONS: PageGuideEntry = {
  title: 'Transactions page',
  intro: 'Your payment history across all orders.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Transaction rows', does: 'Amount, method (card, transfer, cash), status and the order it belongs to. Tap through to the order.' },
        { name: 'Status pills', does: 'Success, pending or failed — pending transfers settle once the money lands.' },
      ],
    },
  ],
}

const FAVORITES: PageGuideEntry = {
  title: 'Favorites page',
  intro: 'Restaurants you hearted, with filters to find the right one fast.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Search field', does: 'Filters your favorites by name.' },
        { name: 'Tag chips', does: 'Filter by cuisine — only tags your favorites actually have.' },
        { name: 'Open now', does: 'Hides kitchens that are currently closed.' },
        { name: 'Sort menu', does: 'Order by rating, delivery time or fee.' },
        { name: 'Heart on a card', does: 'Removes the restaurant from favorites.' },
      ],
    },
  ],
}

const PROMOS: PageGuideEntry = {
  title: 'Promos & referrals page',
  intro: 'Every discount you can use, plus your personal referral code.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Promo cards', does: 'Code, what it gives and the minimum order. Tap copy, then paste it at checkout.' },
        { name: 'Your referral code', does: 'Share it — friends get a discount and you get credited when they order.' },
      ],
    },
  ],
}

const NOTIFICATIONS: PageGuideEntry = {
  title: 'Notifications page',
  intro: 'Order updates, promos and account alerts.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'Notification rows', does: 'Tap one to open the related order or page. Unread ones are highlighted.' },
        { name: 'Mark all read', does: 'Clears the unread badge in one tap.' },
      ],
    },
  ],
}

const HELP: PageGuideEntry = {
  title: 'Help & support page',
  intro: 'Answers to common questions and ways to reach a human.',
  sections: [
    {
      heading: 'On this page',
      items: [
        { name: 'FAQ accordions', does: 'Tap a question to open the answer.' },
        { name: 'Contact cards', does: 'Email or call support directly.' },
        { name: 'Purple assistant', does: 'The ✦ floating button also answers most questions instantly.' },
      ],
    },
  ],
}

const FALLBACK: PageGuideEntry = {
  title: 'This page',
  intro: 'Part of the Purple Foods customer app.',
  sections: [HEADER_TOOLS],
}

/** Resolve the guide entry for the current route path. */
export function guideForPath(path: string): PageGuideEntry {
  if (path === '/') return HOME
  if (path.startsWith('/r/')) return RESTAURANT
  if (path.startsWith('/item/')) return ITEM
  if (path.startsWith('/category/')) return CATEGORY
  if (path.startsWith('/order-success')) return ORDER_SUCCESS
  if (path === '/restaurants') return RESTAURANTS
  if (path === '/search') return SEARCH
  if (path === '/cart') return CART
  if (path === '/checkout') return CHECKOUT
  if (path === '/orders') return ORDERS
  if (path.startsWith('/orders/')) return TRACKING
  if (path === '/account') return ACCOUNT
  if (path === '/account/edit') return EDIT_PROFILE
  if (path === '/account/addresses') return ADDRESSES
  if (path === '/account/payments') return PAYMENTS
  if (path === '/account/transactions') return TRANSACTIONS
  if (path === '/favorites') return FAVORITES
  if (path === '/promos') return PROMOS
  if (path === '/notifications') return NOTIFICATIONS
  if (path === '/help') return HELP
  return FALLBACK
}
