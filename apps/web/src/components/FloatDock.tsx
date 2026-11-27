import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CircleHelp, Home, Sparkles, X } from 'lucide-react'
import { FLOAT_TOOLS, guideForPath } from '../lib/pageGuide'
import { Grain } from '../ui'

/** Ask the Assistant (mounted in App) to open itself. */
export function openAssistant() {
  window.dispatchEvent(new CustomEvent('pf:assistant-open'))
}

/**
 * Floating dock — sits above the AI launcher on the bottom-right:
 * a Home pill (on every page except Home itself) and the "?" page-guide
 * button. The guide knows the current route and explains every control
 * on it, so a first-time user is never stuck.
 */
export function FloatDock() {
  const loc = useLocation()
  const [guideOpen, setGuideOpen] = useState(false)
  const guide = guideForPath(loc.pathname)
  const sections = [...guide.sections, FLOAT_TOOLS]

  // Close the guide whenever the customer navigates.
  useEffect(() => setGuideOpen(false), [loc.pathname])

  return (
    <>
      {/* Dock — stacked above the Assistant launcher (bottom-24 / md:bottom-6
          plus its 3.5rem height and a gap). */}
      <div className="fixed bottom-[10.25rem] right-4 z-40 flex flex-col items-end gap-2.5 md:bottom-[5.75rem] md:right-6">
        {loc.pathname !== '/' && (
          <Link
            to="/"
            aria-label="Go to the Home page"
            className="flex items-center gap-1.5 rounded-full border border-royal/25 bg-card py-2.5 pl-3 pr-4 text-xs font-extrabold text-royal shadow-lg shadow-plum/15 transition-all duration-200 hover:-translate-y-0.5 hover:border-royal hover:shadow-xl active:scale-95"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        )}
        <button
          onClick={() => setGuideOpen(true)}
          aria-label={`Guide: what everything on the ${guide.title} does`}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-royal/25 bg-card text-royal shadow-lg shadow-plum/15 transition-all duration-200 hover:-translate-y-0.5 hover:border-royal hover:shadow-xl active:scale-95 ${
            guideOpen ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <CircleHelp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Page-guide panel */}
      <div
        className={`fixed inset-x-3 bottom-3 top-20 z-50 flex flex-col overflow-hidden rounded-3xl border border-royal/25 bg-background shadow-2xl shadow-plum-deep/40 transition-all duration-300 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-6 sm:w-[24rem] ${
          guideOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-6 opacity-0'
        }`}
        role="dialog"
        aria-label={`Guide to the ${guide.title}`}
        aria-hidden={!guideOpen}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-plum-deep via-plum to-royal px-4 py-3.5 text-lilac">
          <Grain />
          <div className="relative flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/20 ring-1 ring-saffron/40">
              <CircleHelp className="h-5 w-5 text-saffron" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-extrabold tracking-tight">Page guide</p>
              <p className="truncate text-[11px] text-lilac/70">{guide.title} — what everything does</p>
            </div>
            <button
              onClick={() => setGuideOpen(false)}
              aria-label="Close guide"
              className="rounded-full p-1.5 transition-colors hover:bg-lilac/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-lilac/40 p-3.5">
          <p className="rounded-2xl border border-border bg-card p-3.5 text-sm leading-relaxed text-plum shadow-sm">
            {guide.intro}
          </p>
          {sections.map((s) => (
            <section key={s.heading}>
              <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-royal">
                {s.heading}
              </p>
              <ul className="space-y-1.5">
                {s.items.map((it) => (
                  <li key={it.name} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <p className="text-xs font-extrabold text-plum">{it.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{it.does}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer — hand off to the AI for anything the guide didn't cover. */}
        <div className="border-t border-border bg-card p-3">
          <button
            onClick={() => {
              setGuideOpen(false)
              openAssistant()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-royal to-plum py-3 text-sm font-extrabold text-lilac shadow-md transition-transform duration-150 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 text-saffron" aria-hidden="true" />
            Ask Purple about this page
          </button>
        </div>
      </div>
    </>
  )
}
