import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { Mono } from '../ui'

export default function EditProfilePage() {
  const { session, setSession, updateSessionUser } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(session?.user.name ?? '')
  const [phone, setPhone] = useState(session?.user.phone ?? '')

  const update = trpc.auth.updateProfile.useMutation({
    onSuccess: (user) => {
      updateSessionUser(user)
      // Keep the local checkout prefill in step.
      if (session) setSession({ ...session, user })
      toast.success('Profile saved')
      navigate('/account')
    },
    onError: (e) => toast.error('Could not save', { description: e.message }),
  })

  if (!session) {
    navigate('/auth', { replace: true })
    return null
  }

  const submit = () => {
    const patch: { name?: string; phone?: string } = {}
    if (name.trim() && name.trim() !== session.user.name) patch.name = name.trim()
    if (phone.trim() && phone.trim() !== session.user.phone) patch.phone = phone.trim()
    if (!Object.keys(patch).length) {
      toast.info('Nothing changed')
      return
    }
    update.mutate(patch)
  }

  return (
    <div className="px-4 pt-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full border border-border bg-card p-2.5 text-plum transition-transform duration-150 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-plum">Edit profile</h1>
          <Mono className="text-muted-foreground">[SAVED TO YOUR ACCOUNT]</Mono>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="ep-name" className="text-xs font-bold text-plum">Full name</label>
          <input
            id="ep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
          />
        </div>
        <div>
          <label htmlFor="ep-phone" className="text-xs font-bold text-plum">Phone number</label>
          <input
            id="ep-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 000 0000"
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-royal"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Your delivery contact. Changing it here also moves OTP sign-in to the new number.
          </p>
        </div>
        {session.user.email && (
          <div>
            <label htmlFor="ep-email" className="text-xs font-bold text-plum">Email</label>
            <input
              id="ep-email"
              value={session.user.email}
              readOnly
              aria-readonly
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm opacity-70 outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Email is your sign-in identity — it can’t be changed here.</p>
          </div>
        )}
        <button
          onClick={submit}
          disabled={update.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-plum py-3.5 text-sm font-extrabold text-lilac transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save changes
        </button>
      </div>
    </div>
  )
}
