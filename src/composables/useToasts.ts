import { readonly, shallowReactive } from 'vue'

export type ToastTone = 'info' | 'error'

export interface Toast {
    id: number
    message: string
    tone: ToastTone
}

const MAX_TOASTS = 4

const DURATION: Record<ToastTone, number> = { info: 4000, error: 8000 }

const toasts = shallowReactive<Toast[]>([])

let lastId = 0

export const dismissToast = (id: number) => {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index !== -1) toasts.splice(index, 1)
}

export const notify = (message: string, tone: ToastTone = 'info') => {
    const id = ++lastId
    toasts.push({ id, message, tone })
    if (toasts.length > MAX_TOASTS) toasts.shift()
    setTimeout(() => dismissToast(id), DURATION[tone])
}

export const useToasts = () => readonly(toasts)
