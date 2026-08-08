import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"

function ToastIcon({ variant }: { variant?: string | null }) {
  if (variant === "destructive")
    return (
      <div className="shrink-0 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
        <XCircle className="h-5 w-5 text-white" />
      </div>
    );
  return (
    <div className="shrink-0 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
      <CheckCircle2 className="h-5 w-5 text-white" />
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <ToastIcon variant={variant} />
            <div className="flex-1 min-w-0 grid gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
