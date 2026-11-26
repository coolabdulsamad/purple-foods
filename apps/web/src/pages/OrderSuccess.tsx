import { Link, useParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { Grain, Mono } from '../ui'
import { useStore } from '../store'

export default function OrderSuccessPage() {
  const { ref } = useParams()
  const { session } = useStore()

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-plum-deep px-6 text-center text-lilac">
      <Grain />
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-mint text-plum-deep shadow-xl">
        <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
      </span>
      <Mono className="mt-6 text-saffron">[ORDER {ref ?? ''}]</Mono>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight">
        Order placed.
        <br />
        The kitchen has <span className="text-saffron">your ticket.</span>
      </h1>
      <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-lilac/75">
        {session
          ? 'Track it live — it moves from Received to your doorstep.'
          : 'Sign in to watch it move from Received to your doorstep, live.'}
      </p>
      <div className="mt-8 w-full max-w-xs space-y-2.5">
        {session ? (
          <Link
            to={`/orders/${ref}`}
            className="block w-full rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
          >
            Track my order
          </Link>
        ) : (
          <Link
            to="/auth"
            className="block w-full rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
          >
            Sign in to track it live
          </Link>
        )}
        <Link
          to="/"
          className="block w-full rounded-full border border-lilac/25 py-3.5 text-sm font-bold text-lilac transition-colors hover:bg-plum active:scale-[0.98]"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
