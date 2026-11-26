import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banknote, CreditCard, Loader2, MapPin, ShieldCheck, ShoppingBag, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Mono, fmt } from '../ui'

const PAYMENTS = [
  { id: 'paystack' as const, label: 'Card via Paystack', desc: 'Secured handoff — live in the payments phase', icon: CreditCard },
  { id: 'flutterwave' as const, label: 'Flutterwave', desc: 'Cards, transfer and USSD — live in the payments phase', icon: Wallet },
  { id: 'cod' as const, label: 'Cash on delivery', desc: 'Rider collects on handover', icon: Banknote },
]

export default function CheckoutPage() {
  const { lines, subtotalKobo, deliveryFeeKobo, totalKobo, area, profile, saveProfile, clear, cartRestaurant, session } = useStore()
  const navigate = useNavigate()
  const areasQuery = trpc.catalog.areas.useQuery()
  const addressesQuery = trpc.addresses.list.useQuery(undefined, { enabled: !!session })
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, street: profile.street, notes: profile.notes })
  const [areaId, setAreaId] = useState(area?.id ?? '')
  const [payment, setPayment] = useState<'paystack' | 'flutterwave' | 'cod'>('cod')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      saveProfile({ name: form.name.trim(), phone: form.phone.trim(), street: form.street.trim(), notes: form.notes.trim() })
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

  const phonePinned = !!session?.user.phone

  const applyAddress = (id: string) => {
    const a = (addressesQuery.data ?? []).find((x) => x.id === id)
    if (!a) return
    setForm((f) => ({ ...f, street: a.street, notes: a.notes }))
    setAreaId(a.areaId)
    toast.success(`Delivering to “${a.label}”`, { description: `${a.street}, ${a.areaName}` })
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
          ) : session ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Add your number once — it becomes your delivery contact and gets saved to your account.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tip: <Link to="/auth" className="font-bold text-royal underline underline-offset-2">sign in</Link> to track every order automatically.
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
