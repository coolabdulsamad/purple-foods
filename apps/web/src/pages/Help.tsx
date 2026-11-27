import { ChevronDown, LifeBuoy, Mail, Phone } from 'lucide-react'
import { PageHero } from '../ui'

const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'Open Orders from the bottom bar and tap any order — you get a live stepper from Received through Delivered, refreshed every 15 seconds.',
  },
  {
    q: 'What payment methods can I use?',
    a: 'Pay cash on delivery, by card via Paystack, or by bank transfer — for transfers we generate dedicated account details and a unique reference for each order.',
  },
  {
    q: 'Where do you deliver?',
    a: 'Abuja first: Wuse 2, Maitama, Asokoro, Garki, Jabi and Gwarinpa. More zones join as rider coverage grows.',
  },
  {
    q: 'How do I change my delivery address?',
    a: 'Save addresses under Account → Saved addresses, or pick a different zone from the top bar any time. Checkout prefills from your default address.',
  },
  {
    q: 'Can I order without an account?',
    a: 'Yes — guest checkout works with just a name, phone number and address. Sign in later and your history follows your phone number.',
  },
  {
    q: 'How do referrals work?',
    a: 'Share your code from Promos & referrals. Friends get ₦1,000 off their first order; you earn a free-delivery credit when it arrives.',
  },
]

export default function HelpPage() {
  return (
    <div className="pb-8">
      <PageHero icon={LifeBuoy} title="Help & support" sub="We answer fast" />
      <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
      <div className="grid grid-cols-2 gap-2">
        <a
          href="mailto:support@purplefoods.ng"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:bg-lilac active:scale-[0.98]"
        >
          <Mail className="h-5 w-5 text-royal" aria-hidden="true" />
          <span className="text-xs font-bold text-plum">Email us</span>
          <span className="break-all font-mono text-[10px] text-muted-foreground">support@purplefoods.ng</span>
        </a>
        <a
          href="tel:+2348000000000"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:bg-lilac active:scale-[0.98]"
        >
          <Phone className="h-5 w-5 text-royal" aria-hidden="true" />
          <span className="text-xs font-bold text-plum">Call us</span>
          <span className="font-mono text-[10px] text-muted-foreground">0800 000 0000</span>
        </a>
      </div>

      <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-royal">Frequently asked</h2>
      <div className="mt-2 space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-border bg-card px-4 py-3.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-plum [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-royal" aria-hidden="true" />
          <p className="text-sm font-bold text-plum">Terms & privacy</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Purple Foods is a Smadsoft Technology Limited product. Orders placed in this build are written to the live
          development database for testing and carry no commercial obligation. Production terms ship with the launch review.
        </p>
      </div>

      <p className="pb-4 pt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Purple Foods · © Smadsoft Technology Limited
      </p>
      </div>
    </div>
  )
}
