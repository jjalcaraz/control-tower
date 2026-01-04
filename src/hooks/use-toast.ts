import { useState, useCallback } from 'react'

interface ToastMessage {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastInstance: ((message: ToastMessage) => void) | null = null

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((message: ToastMessage) => {
    // For now, we'll use console.log as a simple implementation
    // This can be replaced with a proper toast notification system later
    console.log(`Toast: ${message.title}`, message.description)
    
    // You could also show a simple alert in development
    const alertMessage = message.description 
      ? `${message.title}: ${message.description}`
      : message.title
    
    if (message.variant === 'destructive') {
      console.error(alertMessage)
    } else {
      console.info(alertMessage)
    }
    
    // Add to toasts array for potential future UI implementation
    setToasts(prev => [...prev, message])
    
    // Remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 3000)
  }, [])

  // Store the toast function globally for the first instance
  if (!toastInstance) {
    toastInstance = toast
  }

  return { toast, toasts }
}

// Export a simple toast function that can be used without the hook
export const toast = (message: ToastMessage) => {
  if (toastInstance) {
    toastInstance(message)
  } else {
    // Fallback if no hook instance exists
    console.log(`Toast: ${message.title}`, message.description)
  }
}