import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft, ArrowRight, Banknote, Bike, ChefHat, ClipboardList, Copy, CreditCard, Flame,
  Loader2, Minus, PackageCheck, Plus, Search, ShoppingBag, Star, Trash2, User, Wallet, WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from './store'
import { AddButton, DishArt, Grain, Marquee, Mono, fmt } from './ui'
import { ORDER_STEPS } from './types'
import type { OrderDto } from './types'

const STEP_ICONS = [ClipboardList, ChefHat, Bike, PackageCheck]

function scrollToFeed() {
  document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' })
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Star className="h-3 w-3 fill-saffron text-saffron" aria-hidden="true" />
      {value.toFixed(1)}
    </span>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
      <WifiOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-plum">{message}</p>
      <button onClick={onRetry} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
        Retry
      </button>
    </div>
  )
}

/* ------------------------------ HOME ------------------------------ */

export function HomePage() {
  const { area } = useStore()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const restaurantsQuery = trpc.catalog.restaurants.useQuery()

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of restaurantsQuery.data ?? []) r.tags.forEach((t) => set.add(t))
    return ['All', ...Array.from(set).sort()]
  }, [restaurantsQuery.data])

  const filtered = useMemo(
    () =>
      (restaurantsQuery.data ?? []).filter(
        (r) =>
          (cat === 'All' || r.tags.includes(cat)) &&
          (q.trim() === '' || `${r.name} ${r.tags.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [restaurantsQuery.data, cat, q],
  )

  const promos = [
    {
      bg: 'bg-saffron text-plum-deep',
      rotate: '-rotate-[1.5deg]',
      title: 'Free delivery on your first order',
      body: 'No code needed — applied automatically at checkout while the launch window lasts.',
      cta: 'Order now',
      action: scrollToFeed,
    },
    {
      rotate: 'rotate-[1deg]',
      title: 'Invite friends, eat free',
      body: 'Your code gives them ₦1,000 off. You get a free delivery credit when their first order lands.',
      cta: 'Get my code',
      action: () => navigate('/account'),
    },
    {
      rotate: '-rotate-[1deg]',
      title: 'Suya nights, till 2am',
      body: 'Late grills from Yaba to the Island. Yaji-heavy, flame-first, still hot at your door.',
      cta: 'See grills',
      action: () => {
        setCat('Suya & Grill')
        scrollToFeed()
      },
    },
  ]

  return (
    <div>
      <section className="relative overflow-hidden bg-plum-deep px-4 pb-8 pt-20 text-lilac">
        <Grain />
        <Mono className="text-saffron">[LAGOS · {(area?.name ?? 'LAGOS').toUpperCase()}]</Mono>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.02] tracking-tight">
          Hungry?
          <br />
          Lagos is <span className="text-saffron">served hot.</span>
        </h1>
        <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-lilac/80">
          Restaurants, grills and bukas around you — tracked from flame to your doorstep.
        </p>
        <label className="mt-5 flex items-center gap-2 rounded-2xl bg-lilac px-4 py-3 text-plum shadow-lg">
          <Search className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
          <span className="sr-only">Search restaurants and dishes</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search amala, suya, shawarma…"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-plum/50"
          />
        </label>
      </section>

      <Marquee items={['Free delivery on first order', 'Invite friends — earn ₦1,000', 'Suya nights till 2am', 'PurpleMart groceries loading']} />

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Cuisine categories">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors duration-150 ${
              cat === c ? 'border-plum bg-plum text-lilac' : 'border-border bg-card text-plum hover:bg-lilac'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto px-4 pb-2 pt-1">
        {promos.map((p) => (
          <article key={p.title} className={`flex w-[78%] shrink-0 flex-col rounded-2xl p-4 shadow-md transition-transform duration-200 ${p.rotate} ${p.bg ?? 'bg-royal text-lilac'}`}>
            <h2 className="font-display text-lg font-extrabold leading-tight tracking-tight">{p.title}</h2>
            <p className="mt-1 text-xs leading-relaxed opacity-85">{p.body}</p>
            <button
              onClick={p.action}
              className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-plum-deep px-3.5 py-1.5 text-xs font-bold text-lilac transition-transform duration-150 hover:gap-2 active:scale-95"
            >
              {p.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      <section id="feed" className="mt-4 px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-plum">
            {cat === 'All' ? 'Near you' : cat}
          </h2>
          <Mono className="text-muted-foreground">[{filtered.length} SPOTS]</Mono>
        </div>
        {restaurantsQuery.isLoading ? (
          <LoadingBlock label="Loading kitchens near you…" />
        ) : restaurantsQuery.isError ? (
          <ErrorBlock message="Could not load restaurants." onRetry={() => restaurantsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <Search className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-plum">Nothing matches “{q}”</p>
            <p className="mt-1 text-xs text-muted-foreground">Try another dish, or clear the search.</p>
            <button onClick={() => setQ('')} className="mt-3 rounded-full bg-plum px-4 py-2 text-xs font-bold text-lilac active:scale-95">
              Clear search
            </button>
          </div>
        ) : (
          <ul className="mt-3 space-y-4">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/r/${r.slug}`}
                  className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <DishArt seed={r.id} className="h-36 w-full" />
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-extrabold tracking-tight text-plum">{r.name}</h3>
                      <Mono className="shrink-0 text-muted-foreground">{r.areaName.toUpperCase()}</Mono>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                      <Mono>[{r.etaMin}–{r.etaMax} MIN]</Mono>
                      <Mono>[<Rating value={r.rating} /> · {r.reviewCount.toLocaleString()}]</Mono>
                      <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
                    </div>
                    {r.promo && (
                      <p className="mt-2 inline-block rounded-full bg-saffron-soft px-2.5 py-1 text-[11px] font-bold text-plum">{r.promo}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ---------------------------- RESTAURANT ---------------------------- */

export function RestaurantPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { count, totalKobo } = useStore()
  const restaurantQuery = trpc.catalog.restaurant.useQuery({ slug: slug ?? '' }, { enabled: !!slug })

  if (restaurantQuery.isLoading) {
    return <div className="pt-24"><LoadingBlock label="Opening the kitchen…" /></div>
  }
  if (restaurantQuery.isError) {
    return <div className="pt-24"><ErrorBlock message="Could not load this restaurant." onRetry={() => restaurantQuery.refetch()} /></div>
  }
  const r = restaurantQuery.data
  if (!r) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="font-display text-xl font-extrabold text-plum">That kitchen closed its page.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Back to restaurants
        </Link>
      </div>
    )
  }
  const groups: { cat: string; items: typeof r.menu }[] = []
  for (const item of r.menu) {
    const g = groups.find((x) => x.cat === item.category)
    if (g) g.items.push(item)
    else groups.push({ cat: item.category, items: [item] })
  }
  return (
    <div className="pb-8">
      <div className="relative">
        <DishArt seed={r.id + '-hero'} className="h-44 w-full" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute left-4 top-16 rounded-full bg-card/95 p-2.5 text-plum shadow-md transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-plum">{r.name}</h1>
          <Mono className="mt-1.5 shrink-0 text-muted-foreground">{r.areaName.toUpperCase()}</Mono>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-muted-foreground">
          <Mono>[{r.etaMin}–{r.etaMax} MIN]</Mono>
          <Mono>[<Rating value={r.rating} /> · {r.reviewCount.toLocaleString()} REVIEWS]</Mono>
          <Mono>[{fmt(r.deliveryFeeKobo)} DELIVERY]</Mono>
          {!r.isOpen && <Mono className="text-destructive">[CLOSED NOW]</Mono>}
        </div>
        {r.promo && (
          <p className="mt-3 rounded-xl bg-saffron-soft px-3 py-2 text-xs font-bold text-plum">{r.promo}</p>
        )}
      </div>
      {groups.map((g) => (
        <section key={g.cat} className="mt-6 px-4">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.14em] text-royal">{g.cat}</h2>
          <ul className="mt-1 divide-y divide-border">
            {g.items.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-plum">
                    {m.name}
                    {m.isPopular && <span className="rounded-full bg-lilac-deep px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-royal">Popular</span>}
                    {m.isSpicy && <Flame className="h-3.5 w-3.5 text-saffron" aria-label="Spicy" />}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
                </div>
                <AddButton item={m} r={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {count > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-[72px] left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 items-center justify-between rounded-full bg-plum px-5 py-3.5 text-sm font-bold text-lilac shadow-xl transition-transform duration-150 active:scale-[0.98]"
        >
          <span>View cart · {count} item{count > 1 ? 's' : ''}</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </Link>
      )}
    </div>
  )
}

/* ------------------------------ CART ------------------------------ */

export function CartPage() {
  const { lines, subtotalKobo, deliveryFeeKobo, totalKobo, setQty, clear, cartRestaurant } = useStore()
  if (!lines.length) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <ShoppingBag className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Good food is one tap away.</p>
        <Link to="/" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Browse restaurants
        </Link>
      </div>
    )
  }
  return (
    <div className="px-4 pt-20">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Cart</h1>
        <button
          onClick={() => {
            clear()
            toast.success('Cart cleared')
          }}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>
      <Mono className="mt-1 text-muted-foreground">[{(cartRestaurant?.name ?? '').toUpperCase()}]</Mono>
      <ul className="mt-4 space-y-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <DishArt seed={l.itemId} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-plum">{l.name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{fmt(l.priceKobo)} each</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-lilac px-1.5 py-1">
              <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Reduce ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span key={l.qty} className="min-w-5 animate-bump text-center font-mono text-sm font-bold text-plum">{l.qty}</span>
              <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Add one more ${l.name}`} className="rounded-full p-1.5 text-plum transition-colors hover:bg-lilac-deep active:scale-95">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="w-16 shrink-0 text-right font-mono text-sm font-bold text-plum">{fmt(l.priceKobo * l.qty)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotalKobo)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-muted-foreground">
          <span>Delivery</span>
          <span className="font-mono">{fmt(deliveryFeeKobo)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-plum">
          <span>Total</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </div>
      </div>
      <Link
        to="/checkout"
        className="mt-5 flex items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
      >
        Checkout · {fmt(totalKobo)}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

/* ---------------------------- CHECKOUT ---------------------------- */

const PAYMENTS = [
  { id: 'paystack' as const, label: 'Card via Paystack', desc: 'Secured handoff — live in the payments phase', icon: CreditCard },
  { id: 'flutterwave' as const, label: 'Flutterwave', desc: 'Cards, transfer and USSD — live in the payments phase', icon: Wallet },
  { id: 'cod' as const, label: 'Cash on delivery', desc: 'Rider collects on handover', icon: Banknote },
]

export function CheckoutPage() {
  const { lines, subtotalKobo, deliveryFeeKobo, totalKobo, area, profile, saveProfile, clear, cartRestaurant } = useStore()
  const navigate = useNavigate()
  const areasQuery = trpc.catalog.areas.useQuery()
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, street: profile.street, notes: profile.notes })
  const [areaId, setAreaId] = useState(area?.id ?? '')
  const [payment, setPayment] = useState<'paystack' | 'flutterwave' | 'cod'>('cod')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      saveProfile({ name: form.name.trim(), phone: form.phone.trim(), street: form.street.trim(), notes: form.notes.trim() })
      clear()
      navigate(`/orders?new=${result.humanRef}`)
    },
    onError: (err) => {
      toast.error('Order not placed', { description: err.message })
    },
  })

  useEffect(() => {
    if (!areaId && areasQuery.data?.length) setAreaId(area?.id ?? areasQuery.data[0].id)
  }, [areasQuery.data, area, areaId])

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <ShoppingBag className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Nothing to check out</h1>
        <Link to="/" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Browse restaurants
        </Link>
      </div>
    )
  }

  const submit = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Tell us your name'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number'
    if (form.street.trim().length < 5) e.street = 'Street and house number, please'
    if (!areaId) e.area = 'Pick your delivery area'
    setErrors(e)
    if (Object.keys(e).length) return
    if (!cartRestaurant) return
    createOrder.mutate({
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      street: form.street.trim(),
      notes: form.notes.trim(),
      areaId,
      merchantSlug: cartRestaurant.slug,
      paymentMethod: payment,
      items: lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
    })
  }

  return (
    <div className="px-4 pt-20">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Checkout</h1>
      <Mono className="mt-1 text-muted-foreground">[DELIVERY DETAILS]</Mono>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="ck-name" className="text-xs font-bold text-plum">Name</label>
          <input
            id="ck-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
            placeholder="Your name"
          />
          {errors.name && <p className="mt-1 text-xs font-semibold text-destructive">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="ck-phone" className="text-xs font-bold text-plum">Phone</label>
          <input
            id="ck-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
            placeholder="0803 000 0000"
          />
          {errors.phone && <p className="mt-1 text-xs font-semibold text-destructive">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="ck-street" className="text-xs font-bold text-plum">Street address</label>
          <input
            id="ck-street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
            placeholder="12B Admiralty Way"
          />
          {errors.street && <p className="mt-1 text-xs font-semibold text-destructive">{errors.street}</p>}
        </div>
        <div>
          <label htmlFor="ck-area" className="text-xs font-bold text-plum">Area</label>
          <select
            id="ck-area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
          >
            {(areasQuery.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {errors.area && <p className="mt-1 text-xs font-semibold text-destructive">{errors.area}</p>}
        </div>
        <div>
          <label htmlFor="ck-notes" className="text-xs font-bold text-plum">Rider notes <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input
            id="ck-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
            placeholder="Gate code, landmark, call on arrival…"
          />
        </div>
      </div>

      <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-royal">Payment</h2>
      <div className="mt-2 space-y-2" role="radiogroup" aria-label="Payment method">
        {PAYMENTS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={payment === p.id}
            onClick={() => setPayment(p.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-150 ${
              payment === p.id ? 'border-royal bg-lilac' : 'border-border bg-card hover:bg-lilac/60'
            }`}
          >
            <p.icon className={`h-5 w-5 shrink-0 ${payment === p.id ? 'text-royal' : 'text-muted-foreground'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-plum">{p.label}</span>
              <span className="block text-xs text-muted-foreground">{p.desc}</span>
            </span>
            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${payment === p.id ? 'border-royal bg-royal' : 'border-border'}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotalKobo)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-muted-foreground">
          <span>Delivery</span>
          <span className="font-mono">{fmt(deliveryFeeKobo)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-plum">
          <span>Total</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={createOrder.isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
      >
        {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {createOrder.isPending ? 'Placing order…' : `Place order · ${fmt(totalKobo)}`}
      </button>
      <p className="mt-3 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Orders are written to the live Purple Foods database. Card gateways switch on in the payments phase; cash on delivery works today.
      </p>
    </div>
  )
}

/* ------------------------------ ORDERS ------------------------------ */

const STATUS_STEP: Record<OrderDto['status'], number> = {
  received: 0,
  preparing: 1,
  on_the_way: 2,
  delivered: 3,
  cancelled: 3,
}

const STATUS_LABEL: Record<OrderDto['status'], string> = {
  received: 'Received',
  preparing: 'Preparing',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function EtaClock({ placedAt }: { placedAt: string }) {
  const eta = new Date(new Date(placedAt).getTime() + 30 * 60000)
  const hh = String(eta.getHours()).padStart(2, '0')
  const mm = String(eta.getMinutes()).padStart(2, '0')
  return (
    <span className="font-mono text-sm font-bold text-plum">
      {hh}
      <span className="animate-blink-colon">:</span>
      {mm}
    </span>
  )
}

export function OrdersPage() {
  const { profile } = useStore()
  const [params] = useSearchParams()
  const toasted = useRef(false)
  const hasPhone = profile.phone.replace(/\D/g, '').length >= 10
  const ordersQuery = trpc.orders.mine.useQuery(
    { phone: profile.phone },
    { enabled: hasPhone, refetchInterval: 15000 },
  )

  useEffect(() => {
    const fresh = params.get('new')
    if (fresh && !toasted.current) {
      toasted.current = true
      toast.success(`Order ${fresh} placed`, { description: 'The kitchen has your ticket. Track it live below.' })
    }
  }, [params])

  if (!hasPhone) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">No orders on this phone</h1>
        <p className="mt-1 max-w-[30ch] text-sm text-muted-foreground">
          Orders you place are tied to your phone number. Add it in Account to see your history here.
        </p>
        <Link to="/account" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Add my number
        </Link>
      </div>
    )
  }

  const orders = ordersQuery.data ?? []

  return (
    <div className="px-4 pt-20">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Orders</h1>
      <Mono className="mt-1 text-muted-foreground">[LIVE FROM PURPLE FOODS DB · AUTO-REFRESH 15S]</Mono>
      {ordersQuery.isLoading ? (
        <LoadingBlock label="Fetching your orders…" />
      ) : ordersQuery.isError ? (
        <ErrorBlock message="Could not load your orders." onRetry={() => ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center pt-24 text-center">
          <PackageCheck className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-extrabold text-plum">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your history lands here after the first checkout.</p>
          <Link to="/" className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
            Order something hot
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {orders.map((o) => {
            const step = STATUS_STEP[o.status]
            const cancelled = o.status === 'cancelled'
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold text-royal">{o.humanRef}</p>
                    <p className="mt-0.5 text-sm font-bold text-plum">{o.merchantName}</p>
                  </div>
                  <div className="text-right">
                    <Mono className="text-muted-foreground">[{cancelled ? 'STATUS' : 'ETA'}]</Mono>
                    {cancelled ? (
                      <p className="font-mono text-sm font-bold text-destructive">Cancelled</p>
                    ) : (
                      <p><EtaClock placedAt={o.placedAt} /></p>
                    )}
                  </div>
                </div>
                <ol className="mt-4 flex items-center">
                  {ORDER_STEPS.map((s, i) => {
                    const Icon = STEP_ICONS[i]
                    const done = !cancelled && i < step
                    const current = !cancelled && i === step
                    return (
                      <li key={s} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
                              done ? 'bg-mint text-plum-deep' : current ? 'bg-saffron text-plum-deep' : 'bg-lilac text-muted-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${current ? 'text-plum' : 'text-muted-foreground'}`}>{s}</span>
                        </div>
                        {i < ORDER_STEPS.length - 1 && <span className={`mx-1 mb-4 h-0.5 flex-1 rounded ${done ? 'bg-mint' : 'bg-lilac-deep'}`} aria-hidden="true" />}
                      </li>
                    )
                  })}
                </ol>
                <ul className="mt-3 space-y-1 border-t border-border pt-3">
                  {o.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between text-xs text-muted-foreground">
                      <span>{it.quantity}× {it.name}</span>
                      <span className="font-mono">{fmt(it.lineTotalKobo)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABEL[o.status]} · {o.paymentMethod === 'cod' ? 'Cash on delivery' : o.paymentMethod} · {o.paymentStatus}
                  </p>
                  <p className="font-mono text-sm font-bold text-plum">{fmt(o.totalKobo)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------- ACCOUNT ----------------------------- */

export function AccountPage() {
  const { profile, saveProfile, area } = useStore()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const code = 'PURPLE-' + (profile.name ? String(1000 + (profile.name.length * 37) % 9000) : 'GUEST')

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Referral code copied')
    } catch {
      toast.info(`Your code: ${code}`)
    }
  }

  const save = () => {
    if (form.name.trim().length < 2) return setErr('Tell us your name')
    if (form.phone.replace(/\D/g, '').length < 10) return setErr('Enter a valid phone number')
    setErr('')
    saveProfile({ name: form.name.trim(), phone: form.phone.trim(), street: form.street.trim(), notes: form.notes.trim() })
    setSaved(true)
    toast.success('Details saved', { description: 'Checkout will prefill from these.' })
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-20">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Account</h1>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-royal" aria-hidden="true" />
          <p className="font-display text-sm font-extrabold text-plum">Your details</p>
          {area && <Mono className="ml-auto text-muted-foreground">[{area.name.toUpperCase()}]</Mono>}
        </div>
        <div className="mt-3 space-y-2.5">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            aria-label="Your name"
            placeholder="Name"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-royal"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            aria-label="Phone number"
            inputMode="tel"
            placeholder="Phone — 0803 000 0000"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-royal"
          />
          <input
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            aria-label="Default street address"
            placeholder="Default street address (optional)"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-royal"
          />
          {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
          <button
            onClick={save}
            className="w-full rounded-full bg-plum py-3 text-sm font-bold text-lilac active:scale-[0.98]"
          >
            {saved ? 'Saved ✓' : 'Save details'}
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Your phone number links your orders on the live database. One-time passcode sign-in arrives with the auth phase.
        </p>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl bg-plum-deep p-4 text-lilac">
        <Mono className="text-saffron">[REFERRALS]</Mono>
        <h2 className="mt-1 font-display text-lg font-extrabold leading-tight">Invite friends, eat free.</h2>
        <p className="mt-1 text-xs leading-relaxed text-lilac/80">
          They get ₦1,000 off their first order. You earn a free-delivery credit the moment it arrives.
        </p>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-plum px-4 py-3">
          <span className="font-mono text-sm font-bold tracking-widest text-saffron">{code}</span>
          <button onClick={copyCode} aria-label="Copy referral code" className="flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-xs font-extrabold text-plum-deep active:scale-95">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </button>
        </div>
      </section>

      <section className="mt-4 space-y-2 pb-4">
        <a
          href="mailto:support@purplefoods.ng"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-plum transition-colors hover:bg-lilac"
        >
          Support
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </a>
        <details className="rounded-2xl border border-border bg-card px-4 py-3.5">
          <summary className="cursor-pointer text-sm font-bold text-plum">Terms & privacy</summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Purple Foods is a Smadsoft Technology Limited product. Orders placed in this build are written to the live
            development database for testing and carry no commercial obligation. Production terms ship with the launch review.
          </p>
        </details>
        <p className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Purple Foods · Phase 1 · © Smadsoft Technology Limited
        </p>
      </section>
    </div>
  )
}
