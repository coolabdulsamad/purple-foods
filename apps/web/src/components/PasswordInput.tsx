import { useMemo, useState } from 'react'
import { Check, Eye, EyeOff, ShieldCheck, X } from 'lucide-react'

/** Password rules checked live on the sign-up form. */
export const PASSWORD_RULES: { id: string; label: string; test: (pw: string) => boolean }[] = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'One number (0–9)', test: (pw) => /\d/.test(pw) },
  { id: 'symbol', label: 'One symbol (!@#$%…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export type Strength = { score: number; label: 'Weak' | 'Medium' | 'Strong'; barClass: string; textClass: string }

export function passwordStrength(pw: string): Strength {
  const score = PASSWORD_RULES.filter((r) => r.test(pw)).length
  if (score <= 2) return { score, label: 'Weak', barClass: 'bg-destructive', textClass: 'text-destructive' }
  if (score <= 4) return { score, label: 'Medium', barClass: 'bg-saffron', textClass: 'text-plum' }
  return { score, label: 'Strong', barClass: 'bg-mint', textClass: 'text-plum' }
}

/** Every rule must pass before an account can be created. */
export function passwordValid(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw))
}

/**
 * Password field with a show/hide eye toggle. On sign-up (`showStrength`)
 * it also renders a live strength meter (Weak / Medium / Strong) and the
 * rule checklist, ticking each requirement as it is met.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Password',
  autoComplete = 'current-password',
  showStrength = false,
  ariaLabel,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  showStrength?: boolean
  ariaLabel?: string
}) {
  const [visible, setVisible] = useState(false)
  const strength = useMemo(() => passwordStrength(value), [value])
  // Fill 1–3 bars from the 0–5 rule score: weak 1, medium 2, strong 3.
  const filled = value.length === 0 ? 0 : strength.score <= 2 ? 1 : strength.score <= 4 ? 2 : 3

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-label={ariaLabel ?? placeholder}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm outline-none placeholder:text-plum/40 focus:border-royal"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-plum/50 transition-colors hover:text-royal active:scale-90"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 gap-1 pr-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < filled ? strength.barClass : 'bg-lilac-deep/40'}`}
                />
              ))}
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-extrabold ${strength.textClass}`} role="status">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {strength.label}
            </span>
          </div>
          <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PASSWORD_RULES.map((r) => {
              const met = r.test(value)
              return (
                <li key={r.id} className={`flex items-center gap-1.5 text-[11px] font-semibold ${met ? 'text-plum' : 'text-muted-foreground'}`}>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                      met ? 'bg-mint text-plum-deep' : 'bg-lilac-deep/40 text-muted-foreground'
                    }`}
                  >
                    {met ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : <X className="h-2.5 w-2.5" aria-hidden="true" />}
                  </span>
                  {r.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
