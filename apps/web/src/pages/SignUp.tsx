import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { GoogleButton } from '../components/GoogleButton'
import { Grain, Mono } from '../ui'
import type { AuthResult } from '../types'

export default function SignUpPage() {
  const { setSession, completeOnboarding } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const landed = (r: AuthResult) => {
    setSession({ token: r.token, expiresAt: r.expiresAt, user: r.user })
    completeOnboarding()
    toast.success('Account created', { description: `Welcome to Purple Foods${r.user.name ? `, ${r.user.name}` : ''}.` })
    navigate('/', { replace: true })
  }

  const register = trpc.auth.register.useMutation({
    onSuccess: landed,
    onError: (e) => toast.error('Could not create account', { description: e.message }),
  })

  const submit = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Tell us your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid Nigerian number'
    if (form.password.length < 8) e.password = 'At least 8 characters'
    setErrors(e)
    if (Object.keys(e).length) return
    register.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    })
  }

  const field = (
    id: keyof typeof form,
    label: string,
    opts: { type?: string; inputMode?: 'tel'; placeholder: string; autoComplete?: string },
  ) => (
    <div>
      <label htmlFor={`su-${id}`} className="text-xs font-bold text-plum">{label}</label>
      <input
        id={`su-${id}`}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        type={opts.type ?? 'text'}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete}
        placeholder={opts.placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
      />
      {errors[id] && <p className="mt-1 text-xs font-semibold text-destructive">{errors[id]}</p>}
    </div>
  )

  return (
    <div className="relative min-h-dvh bg-plum-deep text-lilac">
      <Grain />
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-8 md:pt-16">
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="rounded-full bg-lilac/10 p-2.5 text-lilac transition-transform duration-150 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <Mono className="mt-5 block text-saffron">[CREATE ACCOUNT]</Mono>
      <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight">
        Join <span className="text-saffron">Purple Foods.</span>
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lilac/75">
        One account for orders, addresses, favorites and tracking.
      </p>

      <div className="mt-5 rounded-3xl bg-lilac p-4 text-plum shadow-xl">
        <GoogleButton onSuccess={landed} />
        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <Mono className="text-muted-foreground">[OR WITH EMAIL]</Mono>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          {field('name', 'Full name', { placeholder: 'Adaeze Obi', autoComplete: 'name' })}
          {field('email', 'Email', { type: 'email', placeholder: 'you@example.com', autoComplete: 'email' })}
          {field('phone', 'Phone', { inputMode: 'tel', placeholder: '0803 000 0000', autoComplete: 'tel' })}
          {field('password', 'Password', { type: 'password', placeholder: 'At least 8 characters', autoComplete: 'new-password' })}
          <button
            onClick={submit}
            disabled={register.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {register.isPending ? 'Creating account…' : 'Create account'}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth" className="font-bold text-royal underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-lilac/50">
        By continuing you agree to the Purple Foods terms. A Smadsoft Technology Limited product.
      </p>
      </div>
    </div>
  )
}
