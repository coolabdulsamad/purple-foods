import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LocationPicker } from './LocationPicker'

/** Modal wrapper around LocationPicker — pops over Home on first visit and
 *  from the TopBar area button. */
export function LocationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-hidden rounded-3xl border-border p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Choose your delivery area</DialogTitle>
        <LocationPicker onPicked={onClose} />
      </DialogContent>
    </Dialog>
  )
}
