import { useState, useEffect } from "react"

export type ToastProps = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

let toasts: ToastProps[] = []
let listeners: ((toasts: ToastProps[]) => void)[] = []

export function toast({ title, description, variant = "default" }: Omit<ToastProps, "id">) {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = { id, title, description, variant }
  toasts = [...toasts, newToast]
  listeners.forEach((listener) => listener(toasts))

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    listeners.forEach((listener) => listener(toasts))
  }, 3000)
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<ToastProps[]>(toasts)

  useEffect(() => {
    listeners.push(setCurrentToasts)
    return () => {
      listeners = listeners.filter((l) => l !== setCurrentToasts)
    }
  }, [])

  return { toasts: currentToasts, toast }
}
