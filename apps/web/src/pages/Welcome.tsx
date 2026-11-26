import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Bike, Flame, Timer } from 'lucide-react'
import { DishArt, Grain, Mono } from '../ui'

const SLIDES = [
  {
    icon: Flame,
    seed: 'onboard-food',
    kicker: 'RESTAURANTS · GRILLS · BUKAS',
    title: 'All of Abuja’s best kitchens, one app.',
    body: 'Burgers in Wuse 2, suya in Gwarinpa, chapman in Maitama — if it’s hot, it’s on Purple Foods.',
  },
  {
    icon: Timer,
    seed: 'onboard-speed',
    kicker: '12-MINUTE WARMTH SLA',
    title: 'Tracked from flame to your doorstep.',
    body: 'Every order moves through Received → Preparing → On the way → Delivered, live on your screen.',
  },
  {
    icon: Bike,
    seed: 'onboard-rider',
    kicker: 'RIDER NETWORK LIVE',
    title: 'Free delivery on your first order.',
    body: 'No code needed — applied automatically at checkout while the launch window lasts.',
  },
]

export default function WelcomePage() {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-plum-deep text-lilac">
      <Grain />
      <div className="px-5 pt-14">
        <Mono className="text-saffron">[PURPLE FOODS · ABUJA]</Mono>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div key={i} className="flex flex-col items-center">
          <div className="relative">
            <DishArt seed={slide.seed} className="h-44 w-44 rounded-[2.5rem] shadow-2xl" />
            <span className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-saffron text-plum-deep shadow-lg">
              <slide.icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <Mono className="mt-8 text-saffron">[{slide.kicker}]</Mono>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight">{slide.title}</h1>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-lilac/75">{slide.body}</p>
        </div>
      </div>
      <div className="px-5 pb-10">
        <div className="mb-5 flex justify-center gap-1.5" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((_, j) => (
            <button
              key={j}
              role="tab"
              aria-selected={i === j}
              aria-label={`Slide ${j + 1}`}
              onClick={() => setI(j)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === j ? 'w-7 bg-saffron' : 'w-1.5 bg-lilac/30'}`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? navigate('/location') : setI(i + 1))}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-saffron py-4 font-display text-base font-extrabold text-plum-deep shadow-lg transition-transform duration-150 active:scale-[0.98]"
        >
          {last ? 'Set my location' : 'Next'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => navigate('/location')}
          className="mt-3 w-full py-2 text-center text-xs font-bold text-lilac/70 transition-colors hover:text-lilac"
        >
          Skip intro
        </button>
      </div>
    </div>
  )
}
