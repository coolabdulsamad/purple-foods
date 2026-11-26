import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KeyRound, Loader2, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { GoogleButton } from '../components/GoogleButton'
import { FacebookButton } from '../components/FacebookButton'
import { Grain, Mono } from '../ui'
import type { AuthResult } from '../types'

type Method = 'email' | 'phone'

/** Only same-app paths are honored (blocks open redirects). */
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
}

export default function SignInPage() {
  const { setSession, completeOnboarding } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [method, setMethod] = useState<Method>('email')

  // Email + password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Phone OTP
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const landed = (r: AuthResult) => {
    setSession({ token: r.token, expiresAt: r.expiresAt, user: r.user })
    completeOnboarding()
    toast.success('Signed in', { description: `Welcome back${r.user.name ? `, ${r.user.name}` : ''}.` })
    navigate(next ?? '/', { replace: true })
  }

  const login = trpc.auth.loginEmail.useMutation({
    onSuccess: landed,
    onError: (e) => toast.error('Sign-in failed', { description: e.message }),
  })

  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: (r) => {
      setOtpSent(true)
      if (r.devCode) {
        setCode(r.devCode)
        toast.success('Dev code issued', { description: `SMS is not configured yet — your code is ${r.devCode}.` })
      } else {
        toast.success('Code sent', { description: `Check your SMS — the code expires in ${r.ttlMinutes} minutes.` })
      }
    },
    onError: (e) => toast.error('Could not send code', { description: e.message }),
  })

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: landed,
    onError: (e) => toast.error('Sign-in failed', { description: e.message }),
  })

  const submitEmail = () => {
    if (!email.includes('@')) return toast.error('Enter your email address')
    if (!password) return toast.error('Enter your password')
    login.mutate({ email: email.trim(), password })
  }

  const sendCode = () => {
    if (phone.replace(/\D/g, '').length < 10) {
      return toast.error('Enter a valid phone number', { description: 'e.g. 0803 000 0000 or +2348030000000' })
    }
    requestOtp.mutate({ phone: phone.trim() })
  }

  return (
    <div className="relative min-h-dvh bg-plum-deep text-lilac">
      <Grain />
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-14 md:pt-24">
      <Mono className="text-saffron">[STEP 2 OF 2 · ACCOUNT]</Mono>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight">
        Welcome <span className="text-saffron">back.</span>
      </h1>
      <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-lilac/75">
        Sign in to keep your orders, addresses and favorites in one place.
      </p>

      <div className="mt-6 rounded-3xl bg-lilac p-4 text-plum shadow-xl">
        <GoogleButton onSuccess={landed} />
        <div className="mt-2.5">
          <FacebookButton onSuccess={landed} />
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <Mono className="text-muted-foreground">[OR]</Mono>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-full bg-lilac-deep p-1" role="tablist" aria-label="Sign-in method">
          {(
            [
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'phone', label: 'Phone OTP', icon: Phone },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={method === m.id}
              onClick={() => setMethod(m.id)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-colors duration-150 ${
                method === m.id ? 'bg-plum text-lilac' : 'text-plum/60 hover:text-plum'
              }`}
            >
              <m.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>

        {method === 'email' ? (
          <div className="mt-4 space-y-2.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              aria-label="Email address"
              placeholder="Email address"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              aria-label="Password"
              placeholder="Password"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
            />
            <button
              onClick={submitEmail}
              disabled={login.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
            >
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              aria-label="Phone number"
              placeholder="Phone — 0803 000 0000"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
            />
            {otpSent && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                aria-label="6-digit code"
                placeholder="6-digit code"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.4em] text-royal outline-none placeholder:text-plum/40 focus:border-royal"
              />
            )}
            {!otpSent ? (
              <button
                onClick={sendCode}
                disabled={requestOtp.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
              >
                {requestOtp.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Text me a code
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => verifyOtp.mutate({ phone: phone.trim(), code })}
                  disabled={verifyOtp.isPending || code.length !== 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
                >
                  {verifyOtp.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Verify & sign in
                </button>
                <button
                  onClick={sendCode}
                  disabled={requestOtp.isPending}
                  className="rounded-full border border-border px-4 text-xs font-bold text-plum active:scale-[0.98] disabled:opacity-60"
                >
                  Resend
                </button>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link to={`/auth/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-royal underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>

      <button
        onClick={() => {
          completeOnboarding()
          navigate('/', { replace: true })
        }}
        className="mt-5 w-full py-2 text-center text-xs font-bold text-lilac/70 transition-colors hover:text-lilac"
      >
        Skip for now — browse first
      </button>
      </div>
    </div>
  )
}
