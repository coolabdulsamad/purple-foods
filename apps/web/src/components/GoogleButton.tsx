import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import type { AuthResult } from '@/types'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (resp: { credential?: string }) => void }) => void
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
        }
      }
    }
  }
}

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

/**
 * Google Identity Services button. With VITE_GOOGLE_CLIENT_ID set it renders
 * Google's own button and posts the credential to auth.google; without it we
 * show a branded stand-in that explains Google is being connected.
 */
export function GoogleButton({ onSuccess }: { onSuccess: (r: AuthResult) => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [gisReady, setGisReady] = useState(false)
  const google = trpc.auth.google.useMutation({
    onSuccess,
    onError: (e) => toast.error('Google sign-in failed', { description: e.message }),
  })

  useEffect(() => {
    if (!CLIENT_ID) return
    if (document.querySelector('script[data-gis]')) {
      if (window.google) setGisReady(true)
      else document.querySelector('script[data-gis]')!.addEventListener('load', () => setGisReady(true))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.dataset.gis = '1'
    s.onload = () => setGisReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!gisReady || !CLIENT_ID || !hostRef.current || !window.google) return
    hostRef.current.innerHTML = ''
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (resp) => {
        if (resp.credential) google.mutate({ idToken: resp.credential })
        else toast.error('Google sign-in was cancelled')
      },
    })
    window.google.accounts.id.renderButton(hostRef.current, {
      theme: 'outline',
      size: 'large',
      width: 300,
      text: 'continue_with',
      shape: 'pill',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gisReady])

  if (CLIENT_ID) {
    return (
      <div className="flex min-h-11 items-center justify-center">
        {google.isPending ? (
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying with Google…
          </span>
        ) : (
          <div ref={hostRef} />
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        toast.info('Google sign-in is being connected', {
          description: 'Use your email or phone number meanwhile — everything else works today.',
        })
      }
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card py-3 text-sm font-bold text-plum transition-colors hover:bg-lilac active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.6z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z" />
        <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z" />
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.6 1.4l3.3-3.2C16.9 1 14.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 2.9c.9-3 3.6-5 6.8-5z" />
      </svg>
      Continue with Google
    </button>
  )
}
