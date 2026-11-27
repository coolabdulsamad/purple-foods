import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Camera, Loader2, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/providers/trpc'
import { useStore } from '../store'
import { PageHero } from '../ui'

/** Center-crop to a 256×256 square JPEG — small enough to live in the
 *  users table as a data URL, big enough for every avatar slot. */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be loaded'))
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Image editing is not available here'))
        const s = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export default function EditProfilePage() {
  const { session, setSession, updateSessionUser } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(session?.user.name ?? '')
  const [phone, setPhone] = useState(session?.user.phone ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(session?.user.avatarUrl ?? null)
  const fileRef = useRef<HTMLInputElement | null>(null)

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

  const avatarUpload = trpc.auth.updateAvatar.useMutation({
    onSuccess: (user) => {
      updateSessionUser(user)
      if (session) setSession({ ...session, user })
      toast.success('Profile photo updated')
    },
    onError: (e) => {
      setAvatarPreview(session?.user.avatarUrl ?? null)
      toast.error('Could not upload the photo', { description: e.message })
    },
  })

  if (!session) {
    navigate('/auth', { replace: true })
    return null
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file', { description: 'JPEG, PNG or WebP.' })
      return
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      setAvatarPreview(dataUrl) // instant feedback; upload runs behind it
      avatarUpload.mutate({ dataUrl })
    } catch (err) {
      toast.error('Could not use that image', {
        description: err instanceof Error ? err.message : 'Try another one.',
      })
    }
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

  const initial = (session.user.name ?? session.user.email ?? 'P').charAt(0).toUpperCase()
  const inputCls =
    'mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-royal'

  return (
    <div className="pb-8">
      <PageHero icon={User} title="Edit profile" sub="Saved to your account" />
      <div className="mx-auto w-full max-w-xl px-4 md:px-8">

      {/* ── Profile photo ────────────────────────────────────────── */}
      <div className="mt-5 flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Your profile photo"
              className="h-28 w-28 rounded-full object-cover ring-4 ring-lilac"
            />
          ) : (
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-royal to-plum font-display text-4xl font-extrabold text-lilac ring-4 ring-lilac">
              {initial}
            </span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarUpload.isPending}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-saffron text-plum-deep shadow-lg ring-4 ring-card transition-transform active:scale-90 disabled:opacity-60"
          >
            {avatarUpload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              void onPickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-3 text-sm font-extrabold text-plum">{session.user.name ?? 'Purple Foods customer'}</p>
        <p className="font-mono text-xs text-muted-foreground">{session.user.phone ?? session.user.email ?? ''}</p>
        <p className="mt-2 max-w-[30ch] text-center text-[11px] leading-relaxed text-muted-foreground">
          Tap the camera to add a photo — it shows in the header and on your account.
        </p>
      </div>

      {/* ── Details ──────────────────────────────────────────────── */}
      <div className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
        <div>
          <label htmlFor="ep-name" className="flex items-center gap-1.5 text-xs font-bold text-plum">
            <User className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
            Full name
          </label>
          <input
            id="ep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
            className={inputCls}
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
            className={inputCls}
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
              className={`${inputCls} opacity-70`}
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-mint" aria-hidden="true" />
              Email is your sign-in identity — it can’t be changed here.
            </p>
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
    </div>
  )
}
