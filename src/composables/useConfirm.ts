import { readonly, shallowRef } from 'vue'
import type { ConfirmOptions, ConfirmRequest } from '#types/app'

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
