import { toast as baseToast, useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type ToastInput =
  | string
  | {
      title: string
      description?: string
    }

type ToastVariant = 'default' | 'destructive'

function emitToast(input: ToastInput, variant: ToastVariant = 'default') {
  if (typeof input === 'string') {
    baseToast({ title: input, variant })
    return
  }

  baseToast({
    title: input.title,
    description: input.description,
    variant,
  })
}

const sonnerToast = Object.assign(
  (input: ToastInput) => emitToast(input),
  {
    success(input: ToastInput) {
      emitToast(input)
    },
    info(input: ToastInput) {
      emitToast(input)
    },
    warning(input: ToastInput) {
      emitToast(input)
    },
    error(input: ToastInput) {
      emitToast(input, 'destructive')
    },
  }
)

export { sonnerToast as toast }

export function Toaster() {
  const { toasts } = useToast()

  if (!toasts.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-end gap-2 px-4 py-6 sm:items-end sm:justify-start">
      {toasts.map((toast, index) => (
        <div
          key={`${toast.title}-${index}`}
          className={cn(
            'w-full max-w-sm rounded-md border bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
            toast.variant === 'destructive'
              ? 'border-destructive/50 text-destructive'
              : 'border-border text-foreground'
          )}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-xs text-muted-foreground">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
