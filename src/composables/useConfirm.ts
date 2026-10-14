import { readonly, shallowRef } from 'vue'

export interface ConfirmOptions {
    title: string
    message: string
    action: string
}

interface ConfirmRequest extends ConfirmOptions {
    resolve: (confirmed: boolean) => void
}

const pending = shallowRef<ConfirmRequest | null>(null)

export const settleConfirm = (confirmed: boolean) => {
    pending.value?.resolve(confirmed)
    pending.value = null
}

export const confirmAction = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
        settleConfirm(false)
        pending.value = { ...options, resolve }
    })

export const useConfirmRequest = () => readonly(pending)
