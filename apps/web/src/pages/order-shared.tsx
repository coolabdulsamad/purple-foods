import { Bike, ChefHat, ClipboardList, PackageCheck } from 'lucide-react'
import type { OrderDto } from '../types'

export const STEP_ICONS = [ClipboardList, ChefHat, Bike, PackageCheck]

export const STATUS_STEP: Record<OrderDto['status'], number> = {
  received: 0,
  preparing: 1,
  on_the_way: 2,
  delivered: 3,
  cancelled: 3,
}

export const STATUS_LABEL: Record<OrderDto['status'], string> = {
  received: 'Received',
  preparing: 'Preparing',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function EtaClock({ placedAt }: { placedAt: string }) {
  const eta = new Date(new Date(placedAt).getTime() + 30 * 60000)
  const hh = String(eta.getHours()).padStart(2, '0')
  const mm = String(eta.getMinutes()).padStart(2, '0')
  return (
    <span className="font-mono text-sm font-bold text-plum">
      {hh}
      <span className="animate-blink-colon">:</span>
      {mm}
    </span>
  )
}

export function OrderStepper({ status }: { status: OrderDto['status'] }) {
  const step = STATUS_STEP[status]
  const cancelled = status === 'cancelled'
  const steps = ['Received', 'Preparing', 'On the way', 'Delivered']
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => {
        const Icon = STEP_ICONS[i]
        const done = !cancelled && i < step
        const current = !cancelled && i === step
        return (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
                  done ? 'bg-mint text-plum-deep' : current ? 'bg-saffron text-plum-deep' : 'bg-lilac text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${current ? 'text-plum' : 'text-muted-foreground'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <span className={`mx-1 mb-4 h-0.5 flex-1 rounded ${done ? 'bg-mint' : 'bg-lilac-deep'}`} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
