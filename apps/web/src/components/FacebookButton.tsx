import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import type { AuthResult } from '@/types'

declare global {
  interface Window {
    FB?: {
      init: (cfg: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
      login: (cb: (resp: { authResponse?: { accessToken?: string } | null }) => void, opts: { scope: string }) => void
    }
    fbAsyncInit?: () => void
  }
}

const APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined) ?? ''

/**
 * Facebook Login button. With VITE_FACEBOOK_APP_ID set it loads the Facebook
 * JS SDK, runs FB.login for an access token and posts it to auth.facebook;
 * without it we show a branded stand-in that explains Facebook is being connected.
 */
export function FacebookButton({ onSuccess }: { onSuccess: (r: AuthResult) => void }) {
  const [sdkReady, setSdkReady] = useState(false)
  const facebook = trpc.auth.facebook.useMutation({
    onSuccess,
    onError: (e) => toast.error('Facebook sign-in failed', { description: e.message }),
  })

  useEffect(() => {
    if (!APP_ID) return
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: APP_ID, cookie: true, xfbml: false, version: 'v21.0' })
      setSdkReady(true)
    }
    if (document.querySelector('script[data-fbsdk]')) return
    const s = document.createElement('script')
    s.src = 'https://connect.facebook.net/en_US/sdk.js'
    s.async = true
    s.defer = true
    s.crossOrigin = 'anonymous'
    s.dataset.fbsdk = '1'
    document.head.appendChild(s)
  }, [])

  const login = () => {
    if (!sdkReady || !window.FB) {
      toast.info('Facebook is still loading — try again in a second')
      return
    }
    window.FB.login(
      (resp) => {
        const token = resp.authResponse?.accessToken
        if (token) facebook.mutate({ accessToken: token })
        else toast.error('Facebook sign-in was cancelled')
      },
      { scope: 'public_profile,email' },
    )
  }

  return (
    <button
      type="button"
      disabled={facebook.isPending}
      onClick={
        APP_ID
          ? login
          : () =>
              toast.info('Facebook sign-in is being connected', {
                description: 'Use your email or phone number meanwhile — everything else works today.',
              })
      }
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card py-3 text-sm font-bold text-plum transition-colors hover:bg-lilac active:scale-[0.98] disabled:opacity-60"
    >
      {facebook.isPending ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin text-[#1877F2]" aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
          <path
            fill="#1877F2"
            d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"
          />
        </svg>
      )}
      {facebook.isPending ? 'Verifying with Facebook…' : 'Continue with Facebook'}
    </button>
  )
}
