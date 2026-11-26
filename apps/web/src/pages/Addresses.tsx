import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Check, Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { ErrorBlock, LoadingBlock, Mono } from '../ui'

const LABELS = ['Home', 'Work', 'Other']

export default function AddressesPage() {
  const { session } = useStore()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const addressesQuery = trpc.addresses.list.useQuery(undefined, { enabled: !!session })
  const areasQuery = trpc.catalog.areas.useQuery()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: 'Home', street: '', areaId: '', notes: '', isDefault: false })

  const refresh = () => {
    utils.addresses.list.invalidate()
  }
  const create = trpc.addresses.create.useMutation({
    onSuccess: () => {
      refresh()
      setAdding(false)
      setForm({ label: 'Home', street: '', areaId: '', notes: '', isDefault: false })
      toast.success('Address saved')
    },
    onError: (e) => toast.error('Could not save address', { description: e.message }),
  })
  const remove = trpc.addresses.remove.useMutation({
    onSuccess: () => {
      refresh()
      toast.success('Address removed')
    },
    onError: (e) => toast.error('Could not remove', { description: e.message }),
  })
  const setDefault = trpc.addresses.setDefault.useMutation({
    onSuccess: () => {
      refresh()
      toast.success('Default address updated')
    },
    onError: (e) => toast.error('Could not update', { description: e.message }),
  })

  if (!session) {
    return (
      <div className="flex flex-col items-center px-4 pt-32 text-center">
        <MapPin className="h-10 w-10 text-lilac-deep" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-plum">Sign in to save addresses</h1>
        <button onClick={() => navigate('/auth')} className="mt-5 rounded-full bg-plum px-6 py-3 text-sm font-bold text-lilac active:scale-95">
          Sign in
        </button>
      </div>
    )
  }

  const submit = () => {
    if (form.street.trim().length < 5) return toast.error('Street and house number, please')
    if (!form.areaId) return toast.error('Pick the area')
    create.mutate({
      label: form.label,
      street: form.street.trim(),
      areaId: form.areaId,
      notes: form.notes.trim(),
      isDefault: form.isDefault,
    })
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-20 md:px-8 md:pt-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full border border-border bg-card p-2.5 text-plum transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Saved addresses</h1>
          <Mono className="text-muted-foreground">[ONE-TAP CHECKOUT]</Mono>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          aria-label={adding ? 'Cancel' : 'Add address'}
          className="rounded-full bg-plum p-2.5 text-lilac transition-transform duration-150 active:scale-95"
        >
          <Plus className={`h-4 w-4 transition-transform duration-200 ${adding ? 'rotate-45' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {adding && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2" role="radiogroup" aria-label="Address label">
            {LABELS.map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={form.label === l}
                onClick={() => setForm({ ...form, label: l })}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  form.label === l ? 'bg-plum text-lilac' : 'bg-lilac text-plum hover:bg-lilac-deep'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="ad-street" className="text-xs font-bold text-plum">Street address</label>
            <input
              id="ad-street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="12B Aminu Kano Crescent"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ad-area" className="text-xs font-bold text-plum">Area</label>
            <select
              id="ad-area"
              value={form.areaId}
              onChange={(e) => setForm({ ...form, areaId: e.target.value })}
              className={inputCls}
            >
              <option value="">Pick your area…</option>
              {(areasQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ad-notes" className="text-xs font-bold text-plum">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input
              id="ad-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Gate code, landmark…"
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-plum">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 accent-royal"
            />
            Make this my default address
          </label>
          <button
            onClick={submit}
            disabled={create.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save address
          </button>
        </div>
      )}

      {addressesQuery.isLoading ? (
        <LoadingBlock label="Loading your addresses…" />
      ) : addressesQuery.isError ? (
        <ErrorBlock message="Could not load addresses." onRetry={() => addressesQuery.refetch()} />
      ) : (addressesQuery.data ?? []).length === 0 && !adding ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-plum">No saved addresses yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Save home and work once — checkout becomes one tap.</p>
          <button onClick={() => setAdding(true)} className="mt-4 rounded-full bg-plum px-5 py-2.5 text-xs font-bold text-lilac active:scale-95">
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(addressesQuery.data ?? []).map((a) => (
            <li key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-lilac px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-royal">{a.label}</span>
                {a.isDefault && (
                  <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-mint">
                    <Check className="h-3 w-3" aria-hidden="true" /> Default
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-bold text-plum">{a.street}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.areaName}{a.notes ? ` · ${a.notes}` : ''}</p>
              <div className="mt-3 flex gap-2">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefault.mutate({ id: a.id })}
                    disabled={setDefault.isPending}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-plum transition-colors hover:bg-lilac active:scale-95 disabled:opacity-60"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => remove.mutate({ id: a.id })}
                  disabled={remove.isPending}
                  className="flex items-center gap-1 rounded-full border border-destructive/30 px-3.5 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 active:scale-95 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
