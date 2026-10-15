import { computed, shallowReactive } from 'vue'

const modals = shallowReactive<HTMLDialogElement[]>([])

export const showModal = (dialog: HTMLDialogElement) => {
    dialog.showModal()
    modals.push(dialog)
}

export const forgetModal = (dialog: HTMLDialogElement) => {
    const index = modals.indexOf(dialog)
    if (index !== -1) modals.splice(index, 1)
}

export const useTopModal = () => computed(() => modals.at(-1) ?? null)
