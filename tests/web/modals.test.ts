import { describe, expect, it, vi } from 'vitest'
import { forgetModal, showModal, useTopModal } from '@/composables/useModals'

const dialog = () => {
    const element = document.createElement('dialog')
    element.showModal = vi.fn()
    return element
}

describe('modals', () => {
    it('tracks the top modal so overlays can render inside it', () => {
        const topModal = useTopModal()
        const [outer, inner] = [dialog(), dialog()]
        expect(topModal.value).toBeNull()
        showModal(outer)
        showModal(inner)
        expect(outer.showModal).toHaveBeenCalledOnce()
        expect(inner.showModal).toHaveBeenCalledOnce()
        expect(topModal.value).toBe(inner)
        forgetModal(inner)
        expect(topModal.value).toBe(outer)
        forgetModal(inner)
        expect(topModal.value).toBe(outer)
        forgetModal(outer)
        expect(topModal.value).toBeNull()
    })
})
