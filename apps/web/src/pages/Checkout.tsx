import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BadgeCheck, Banknote, CreditCard, Loader2, Lock, LogIn, MapPin, ShieldCheck, ShoppingBag, Tag, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { cartLineUnitKobo } from '../types'
import type { PromoCheckDto } from '../types'
import { DishImage, Mono, fmt } from '../ui'

export default function CheckoutPage() {
  const { lines, subtotalKobo, deliveryFeeKobo, area, profile, saveProfile, clear, cartRestaurant, session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const areasQuery = trpc.catalog.areas.useQuery()
  const addressesQuery = trpc.addresses.list.useQuery(undefined, { enabled: !!session })
  const gatewayQuery = trpc.payments.config.useQuery(undefined, { enabled: !!session })
  const cardsQuery = trpc.payments.cards.useQuery(undefined, { enabled: !!session })
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, street: profile.street, notes: profile.notes })
  const [areaId, setAreaId] = useState(area?.id ?? '')
  const [payment, setPayment] = useState<'paystack' | 'cod'>('cod')
  const [cardId, setCardId] = useState<string | 'new'>('new')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<PromoCheckDto | null>(null)
  const [promoBusy, setPromoBusy] = useState(false)

  const paystackEnabled = gatewayQuery.data?.paystackEnabled ?? false
  const cards = cardsQuery.data ?? []
  const discountKobo = promo?.discountKobo ?? 0
  const effectiveTotal = Math.max(0, subtotalKobo + deliveryFeeKobo - discountKobo)

  const initialize = trpc.payments.initialize.useMutation()
  const chargeCard = trpc.payments.chargeCard.useMutation()

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      saveProfile({ name: form.name.trim(), phone: form.phone.trim(), street: form.street.trim(), notes: form.notes.trim() })
      if (payment === 'paystack') {
        clear()
        if (cardId !== 'new') {
          // One-tap saved card: charge server-side, then land on tracking.
          chargeCard.mutate(
            { cardId, orderId: result.orderId },
            {
              onSuccess: (v) => {
                if (v.status === 'success') navigate(`/order-success/${result.humanRef}`, { replace: true })
                else {
                  toast.error('Card charge did not complete', { description: 'Your order is saved — you can retry payment from tracking.' })
                  navigate(`/orders/${result.humanRef}`, { replace: true })
                }
              },
              onError: (err) => {
                toast.error('Card charge failed', { description: err.message })
                navigate(`/orders/${result.humanRef}`, { replace: true })
              },
            },
          )
        } else {
          // New card: hand off to Paystack hosted checkout.
          initialize.mutate(
            { orderId: result.orderId, callbackBase: window.location.origin },
            {
              onSuccess: (r) => window.location.assign(r.authorizationUrl),
              onError: (err) => {
                toast.error('Could not start card payment', { description: err.message })
                navigate(`/orders/${result.humanRef}`, { replace: true })
              },
            },
          )
        }
        return
      }
      clear()
      navigate(`/order-success/${result.humanRef}`, { replace: true })
    },
    onError: (err) => {
      toast.error('Order not placed', { description: err.message })
    },
  })

  useEffect(() => {
    if (!areaId && areasQuery.data?.length) setAreaId(area?.id ?? areasQuery.data[0].id)
  }, [areasQuery.data, area, areaId])

  // Default to the default saved card when paying with Paystack.
  useEffect(() => {
    if (cards.length && cardId === 'new') setCardId((cards.find((c) => c.isDefault) ?? cards[0]).id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsQuery.data])

  // Keep the form pinned to a sign-in that happens after mount.
  useEffect(() => {
    if (session) {
      setForm((f) => ({ ...f, phone: session.user.phone ?? f.phone, name: f.name || session.user.name || '' }))
    }
  }, [session])

  // Prefill from the default saved address once it loads.
  useEffect(() => {
    const def = (addressesQuery.data ?? []).find((a) => a.isDefault) ?? addressesQuery.data?.[0]
    if (def && !form.street) {
      setForm((f) => ({ ...f, street: def.street, notes: f.notes || def.notes }))
      setAreaId(def.areaId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesQuery.data])

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (code.length < 3 || promoBusy) return
    setPromoBusy(true)
    try {
      const r = await utils.promos.check.fetch({ code, subtotalKobo, deliveryFeeKobo })
      setPromo(r)
      toast.success(`“${r.code}” applied`, { description: r.label })
    } catch (e) {
      setPromo(null)
      toast.error('Code not valid', { description: e instanceof Error ? e.message : 'Try another code.' })
    } finally {
      setPromoBusy(false)
    }
  }

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

  // Checkout requires an account: orders, tracking and history are pinned
  // to a signed-in identity. The cart lives on-device, so it survives the
  // sign-in round-trip and is waiting when the customer lands back here.
  if (!session) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-24 md:pt-32">
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
            <Lock className="h-6 w-6 text-royal" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-plum">Sign in to place your order</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your cart ({lines.reduce((n, l) => n + l.qty, 0)} item{lines.length > 1 || lines[0]?.qty > 1 ? 's' : ''} · {fmt(effectiveTotal)}) is saved on this device — it will be right here when you're back.
          </p>
          <Link
            to="/auth?next=/checkout"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            I have an account — sign in
          </Link>
          <Link
            to="/auth/signup?next=/checkout"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-3.5 text-sm font-extrabold text-plum-deep transition-transform duration-150 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            I'm new — create my account
          </Link>
          <Link to="/cart" className="mt-4 inline-block text-xs font-bold text-royal underline underline-offset-2">
            Back to cart
          </Link>
        </div>

        <ul className="mt-4 space-y-2 rounded-3xl border border-border bg-card p-4">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3">
              <DishImage src={l.photoUrl} seed={l.itemId} className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-plum">{l.qty}× {l.name}</p>
                {(l.options ?? []).length > 0 && (
                  <p className="truncate text-[11px] text-muted-foreground">+ {(l.options ?? []).map((o) => o.name).join(', ')}</p>
                )}
              </div>
              <span className="font-mono text-xs font-bold text-plum">{fmt(cartLineUnitKobo(l) * l.qty)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const phonePinned = !!session?.user.phone

  const applyAddress = (id: string) => {
    const a = (addressesQuery.data ?? []).find((x) => x.id === id)
    if (!a) return
    setForm((f) => ({ ...f, street: a.street, notes: a.notes }))
    setAreaId(a.areaId)
    toast.success(`Delivering to “${a.label}”`, { description: `${a.street}, ${a.areaName}` })
  }

  const busy = createOrder.isPending || initialize.isPending || chargeCard.isPending

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
      promoCode: promo?.code ?? '',
      items: lines.map((l) => ({
        menuItemId: l.itemId,
        quantity: l.qty,
        optionIds: (l.options ?? []).map((o) => o.optionId),
        note: l.note ?? '',
        allergy: l.allergy ?? '',
        cutlery: l.cutlery ?? false,
      })),
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 md:px-8 md:pt-24">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum md:text-3xl">Checkout</h1>
      <Mono className="mt-1 text-muted-foreground">[DELIVERY DETAILS]</Mono>

      <div className="lg:mt-2 lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-10">
      <div>
      {(addressesQuery.data?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-plum">Saved addresses</p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {(addressesQuery.data ?? []).map((a) => (
              <button
                key={a.id}
                onClick={() => applyAddress(a.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-plum transition-colors hover:bg-lilac active:scale-95"
              >
                <MapPin className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
                {a.label} · {a.areaName}
              </button>
            ))}
          </div>
        </div>
      )}

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
            readOnly={phonePinned}
            aria-readonly={phonePinned}
            className={`mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal ${phonePinned ? 'opacity-70' : ''}`}
            placeholder="0803 000 0000"
          />
          {phonePinned ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-mint">
              <ShieldCheck className="h-3 w-3 text-mint" aria-hidden="true" />
              Signed in — your order is pinned to this number.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Add your number once — it becomes your delivery contact and gets saved to your account.
            </p>
          )}
          {errors.phone && <p className="mt-1 text-xs font-semibold text-destructive">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="ck-street" className="text-xs font-bold text-plum">Street address</label>
          <input
            id="ck-street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
            placeholder="12B Aminu Kano Crescent"
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

        <div>
          <label htmlFor="ck-promo" className="text-xs font-bold text-plum">Promo or referral code <span className="font-normal text-muted-foreground">(optional)</span></label>
          {promo ? (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-mint/40 bg-mint/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-plum">
                <BadgeCheck className="h-4 w-4 text-mint" aria-hidden="true" />
                {promo.code} — {promo.label}
              </span>
              <button
                onClick={() => { setPromo(null); setPromoInput('') }}
                aria-label="Remove promo code"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-lilac"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="mt-1 flex gap-2">
              <input
                id="ck-promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm uppercase outline-none focus:border-royal"
                placeholder="WELCOME500"
                maxLength={40}
              />
              <button
                onClick={applyPromo}
                disabled={promoBusy || promoInput.trim().length < 3}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-plum px-4 text-sm font-bold text-lilac transition-transform active:scale-95 disabled:opacity-50"
              >
                {promoBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Tag className="h-4 w-4" aria-hidden="true" />}
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
      <div className="lg:sticky lg:top-24">
      <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-royal lg:mt-2">Payment</h2>
      <div className="mt-2 space-y-2" role="radiogroup" aria-label="Payment method">
        <button
          role="radio"
          aria-checked={payment === 'paystack'}
          onClick={() => {
            if (!paystackEnabled) {
              toast.info('Card payments are being connected', { description: 'Choose cash on delivery for now — your cards will live here soon.' })
              return
            }
            setPayment('paystack')
          }}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-150 ${
            payment === 'paystack' ? 'border-royal bg-lilac' : 'border-border bg-card hover:bg-lilac/60'
          } ${!paystackEnabled ? 'opacity-70' : ''}`}
        >
          <CreditCard className={`h-5 w-5 shrink-0 ${payment === 'paystack' ? 'text-royal' : 'text-muted-foreground'}`} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-plum">Card via Paystack</span>
            <span className="block text-xs text-muted-foreground">{paystackEnabled ? 'Pay now — secured by Paystack' : 'Being connected — available soon'}</span>
          </span>
          <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${payment === 'paystack' ? 'border-royal bg-royal' : 'border-border'}`} aria-hidden="true" />
        </button>
        <button
          role="radio"
          aria-checked={payment === 'cod'}
          onClick={() => setPayment('cod')}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-150 ${
            payment === 'cod' ? 'border-royal bg-lilac' : 'border-border bg-card hover:bg-lilac/60'
          }`}
        >
          <Banknote className={`h-5 w-5 shrink-0 ${payment === 'cod' ? 'text-royal' : 'text-muted-foreground'}`} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-plum">Cash on delivery</span>
            <span className="block text-xs text-muted-foreground">Rider collects on handover</span>
          </span>
          <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${payment === 'cod' ? 'border-royal bg-royal' : 'border-border'}`} aria-hidden="true" />
        </button>
      </div>

      {payment === 'paystack' && paystackEnabled && (
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Choose card">
          {cards.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={cardId === c.id}
              onClick={() => setCardId(c.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                cardId === c.id ? 'border-royal bg-lilac' : 'border-border bg-card hover:bg-lilac/60'
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0 text-royal" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-plum">
                  {c.brand} ···· {c.last4}
                  {c.isDefault && <span className="ml-2 rounded-full bg-lilac-deep px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-royal">Default</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{c.bank} · expires {c.expMonth}/{c.expYear}</span>
              </span>
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${cardId === c.id ? 'border-royal bg-royal' : 'border-border'}`} aria-hidden="true" />
            </button>
          ))}
          <button
            role="radio"
            aria-checked={cardId === 'new'}
            onClick={() => setCardId('new')}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
              cardId === 'new' ? 'border-royal bg-lilac' : 'border-dashed border-border bg-card hover:bg-lilac/60'
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-plum">{cards.length ? 'Use a new card' : 'Pay with card'}</span>
              <span className="block text-xs text-muted-foreground">Secure Paystack checkout — card is saved for next time</span>
            </span>
            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${cardId === 'new' ? 'border-royal bg-royal' : 'border-border'}`} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotalKobo)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-muted-foreground">
          <span>Delivery</span>
          <span className="font-mono">{fmt(deliveryFeeKobo)}</span>
        </div>
        {discountKobo > 0 && (
          <div className="mt-1.5 flex justify-between text-sm font-semibold text-mint">
            <span>Promo ({promo?.code})</span>
            <span className="font-mono">−{fmt(discountKobo)}</span>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-plum">
          <span>Total</span>
          <span className="font-mono">{fmt(effectiveTotal)}</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy
          ? payment === 'paystack'
            ? 'Starting payment…'
            : 'Placing order…'
          : payment === 'paystack'
            ? `Pay ${fmt(effectiveTotal)}`
            : `Place order · ${fmt(effectiveTotal)}`}
      </button>
      <p className="mt-3 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Orders are written to the live Purple Foods database. Card payments run through Paystack's secure checkout — we never see your card number.
      </p>
      </div>
      </div>
    </div>
  )
}
