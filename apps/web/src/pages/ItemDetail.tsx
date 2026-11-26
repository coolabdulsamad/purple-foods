import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, ArrowLeft, Check, Flame, Minus, PencilLine, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import type { LineConfig } from '../store'
import type { CartOptionSelection, MenuOptionDto, MenuOptionGroupDto } from '../types'
import { DishArt, DishImage, ErrorBlock, LoadingBlock, Mono, Rating, fmt } from '../ui'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { add, updateLine, lines, count, totalKobo } = useStore()

  // Edit mode: /item/:id?line=<cartKey> — opened from the cart so the
  // customer can change toppings/notes on a line they already added.
  const editKey = searchParams.get('line')
  const editLine = editKey ? lines.find((l) => l.key === editKey) : undefined

  const [qty, setQtyLocal] = useState(editLine?.qty ?? 1)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((editLine?.options ?? []).map((o) => o.optionId)),
  )
  const [cutlery, setCutlery] = useState(editLine?.cutlery ?? false)
  const [allergy, setAllergy] = useState(editLine?.allergy ?? '')
  const [note, setNote] = useState(editLine?.note ?? '')

  // Resolve id → restaurant slug via the flat item index, then load the
  // full restaurant so Add-to-cart gets the complete DTO it needs.
  const itemsQuery = trpc.catalog.items.useQuery()
  const hit = (itemsQuery.data ?? []).find((i) => i.id === id)
  const restaurantQuery = trpc.catalog.restaurant.useQuery(
    { slug: hit?.merchantSlug ?? '' },
    { enabled: !!hit },
  )

  if (itemsQuery.isLoading || (hit && restaurantQuery.isLoading)) {
    return <div className="pt-24"><LoadingBlock label="Plating up…" /></div>
  }
  if (itemsQuery.isError || restaurantQuery.isError) {
    return <div className="pt-24"><ErrorBlock message="Could not load this dish." onRetry={() => { itemsQuery.refetch(); restaurantQuery.refetch() }} /></div>
  }
  const r = restaurantQuery.data
  const item = r?.menu.find((m) => m.id === id)
  if (!r || !item) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="font-display text-xl font-extrabold text-plum">That dish is off the menu.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-lilac">
          Back to restaurants
        </Link>
      </div>
    )
  }

  const groups = item.optionGroups ?? []

  const toggleOption = (g: MenuOptionGroupDto, o: MenuOptionDto) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(o.id)) {
        next.delete(o.id)
        return next
      }
      if (g.maxSelect === 1) {
        // Radio-style group: replace the group's selection.
        for (const x of g.options) next.delete(x.id)
        next.add(o.id)
        return next
      }
      const inGroup = g.options.filter((x) => next.has(x.id)).length
      if (inGroup >= g.maxSelect) {
        toast.warning(`Choose up to ${g.maxSelect} in “${g.name}”`)
        return prev
      }
      next.add(o.id)
      return next
    })
  }

  const chosenOptions: CartOptionSelection[] = groups.flatMap((g) =>
    g.options
      .filter((o) => selected.has(o.id))
      .map((o) => ({ groupId: g.id, groupName: g.name, optionId: o.id, name: o.name, priceKobo: o.priceKobo })),
  )
  const unitKobo = item.priceKobo + chosenOptions.reduce((n, o) => n + o.priceKobo, 0)

  const buildConfig = (): LineConfig | null => {
    for (const g of groups) {
      if (g.minSelect <= 0) continue
      const n = g.options.filter((o) => selected.has(o.id)).length
      if (n < g.minSelect) {
        toast.error(`“${g.name}” — pick at least ${g.minSelect}`)
        return null
      }
    }
    return { options: chosenOptions, cutlery, allergy: allergy.trim(), note: note.trim() }
  }

  const addToCart = () => {
    const config = buildConfig()
    if (!config) return
    add(item, r, config, qty)
    toast.success(`${qty}× ${item.name} added`, {
      description: chosenOptions.length
        ? `${chosenOptions.map((o) => o.name).join(', ')} · from ${r.name}`
        : `From ${r.name}`,
    })
  }

  const saveEdit = () => {
    if (!editLine) return
    const config = buildConfig()
    if (!config) return
    updateLine(editLine.key, config, qty)
    toast.success(`${item.name} updated`, { description: 'Your cart reflects the new choices.' })
    navigate('/cart')
  }

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-2 md:items-start md:gap-10 md:px-8 md:pt-24">
        <div className="relative">
          <DishImage src={item.photoUrl} seed={item.id} className="h-64 w-full md:sticky md:top-24 md:h-[420px] md:rounded-3xl" />
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="absolute left-4 top-16 rounded-full bg-card/95 p-2.5 text-plum shadow-md transition-transform duration-150 active:scale-95 md:top-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 pt-5 md:px-0 md:pt-0">
        {editLine && (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-soft px-3 py-1.5 text-[11px] font-bold text-plum">
            <PencilLine className="h-3 w-3" aria-hidden="true" />
            Editing this cart item — your changes update the cart
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-plum">{item.name}</h1>
          <p className="mt-1 shrink-0 font-mono text-lg font-bold text-plum">{fmt(item.priceKobo)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.isPopular && <span className="rounded-full bg-lilac-deep px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-royal">Popular</span>}
          {item.isSpicy && (
            <span className="flex items-center gap-1 rounded-full bg-saffron-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-plum">
              <Flame className="h-3 w-3 text-saffron" aria-hidden="true" /> Spicy
            </span>
          )}
          <Mono className="text-muted-foreground">[{item.category.toUpperCase()}]</Mono>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

        <Link
          to={`/r/${r.slug}`}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-lilac/60"
        >
          <DishArt seed={r.id} className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-plum">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              <Rating value={r.rating} /> · {r.etaMin}–{r.etaMax} min · {fmt(r.deliveryFeeKobo)} delivery
            </p>
          </div>
          <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
        </Link>

        {/* ── Toppings / add-ons ─────────────────────────────────── */}
        {groups.map((g) => (
          <div key={g.id} className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-plum">{g.name}</p>
              <span className={`shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest ${g.minSelect > 0 ? 'text-saffron' : 'text-muted-foreground'}`}>
                {g.minSelect > 0 ? `[REQUIRED · PICK ${g.minSelect}${g.maxSelect > g.minSelect ? `–${g.maxSelect}` : ''}]` : g.maxSelect > 1 ? `[CHOOSE UP TO ${g.maxSelect}]` : '[OPTIONAL]'}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {g.options.map((o) => {
                const on = selected.has(o.id)
                return (
                  <button
                    key={o.id}
                    onClick={() => toggleOption(g, o)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors duration-150 active:scale-95 ${
                      on ? 'border-plum bg-plum text-lilac' : 'border-border bg-card text-plum hover:bg-lilac'
                    }`}
                  >
                    {on && <Check className="h-3 w-3" aria-hidden="true" />}
                    {o.name}
                    {o.priceKobo > 0 && <span className={on ? 'text-lilac/80' : 'text-muted-foreground'}>+{fmt(o.priceKobo)}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── Cutlery / allergy / kitchen note ───────────────────── */}
        <button
          onClick={() => setCutlery((v) => !v)}
          aria-pressed={cutlery}
          className={`mt-4 flex w-full items-center justify-between rounded-2xl border p-4 transition-colors duration-150 ${
            cutlery ? 'border-plum bg-lilac' : 'border-border bg-card hover:bg-lilac/60'
          }`}
        >
          <span className="flex items-center gap-2.5 text-sm font-bold text-plum">
            <UtensilsCrossed className="h-4 w-4 text-royal" aria-hidden="true" />
            Need cutlery?
          </span>
          <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-200 ${cutlery ? 'bg-plum' : 'bg-border'}`} aria-hidden="true">
            <span className={`h-5 w-5 rounded-full bg-card shadow transition-transform duration-200 ${cutlery ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <label htmlFor="it-allergy" className="flex items-center gap-2 text-sm font-bold text-plum">
            <AlertTriangle className="h-4 w-4 text-saffron" aria-hidden="true" />
            Allergy or dietary note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="it-allergy"
            value={allergy}
            onChange={(e) => setAllergy(e.target.value)}
            maxLength={200}
            placeholder="e.g. no peanuts, no MSG, lactose-free"
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
          />
          <label htmlFor="it-note" className="mt-4 block text-sm font-bold text-plum">
            Note for the kitchen <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="it-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="e.g. extra spicy, no onions, well done"
            className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="pl-2 text-sm font-bold text-plum">Quantity</span>
          <div className="flex items-center gap-1 rounded-full bg-lilac px-1.5 py-1">
            <button
              onClick={() => setQtyLocal((n) => Math.max(1, n - 1))}
              aria-label="Reduce quantity"
              className="rounded-full p-2 text-plum transition-colors hover:bg-lilac-deep active:scale-95"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span key={qty} className="min-w-7 animate-bump text-center font-mono text-base font-bold text-plum">{qty}</span>
            <button
              onClick={() => setQtyLocal((n) => Math.min(20, n + 1))}
              aria-label="Increase quantity"
              className="rounded-full p-2 text-plum transition-colors hover:bg-lilac-deep active:scale-95"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          onClick={editLine ? saveEdit : addToCart}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
        >
          {editLine ? <PencilLine className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
          {editLine ? `Update cart item · ${fmt(unitKobo * qty)}` : `Add ${qty} to cart · ${fmt(unitKobo * qty)}`}
        </button>
        </div>
      </div>

      {count > 0 && !editLine && (
        <Link
          to="/cart"
          className="fixed bottom-[72px] left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 items-center justify-between rounded-full bg-plum px-5 py-3.5 text-sm font-bold text-lilac shadow-xl transition-transform duration-150 active:scale-[0.98] md:bottom-8 md:left-auto md:right-8 md:w-auto md:min-w-[320px] md:translate-x-0"
        >
          <span>View cart · {count} item{count > 1 ? 's' : ''}</span>
          <span className="font-mono">{fmt(totalKobo)}</span>
        </Link>
      )}
    </div>
  )
}
