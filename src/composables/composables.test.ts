import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmAction, settleConfirm, useConfirmRequest } from './useConfirm'
import { dismissToast, notify, useToasts } from './useToasts'

describe('toasts', () => {
    afterEach(() => {
        for (const { id } of [...useToasts()]) dismissToast(id)
        vi.useRealTimers()
    })

    it('keeps at most four toasts and drops the oldest', () => {
        for (const message of ['1', '2', '3', '4', '5']) notify(message)
        expect(useToasts().map(({ message }) => message)).toEqual(['2', '3', '4', '5'])
    })

    it('dismisses automatically, errors stay longer', () => {
        vi.useFakeTimers()
        notify('saved')
        notify('failed', 'error')
        vi.advanceTimersByTime(4000)
        expect(useToasts().map(({ message, tone }) => [message, tone])).toEqual([
            ['failed', 'error'],
        ])
        vi.advanceTimersByTime(4000)
        expect(useToasts()).toHaveLength(0)
    })
})

describe('confirmAction', () => {
    const options = { title: 'Delete', message: 'Sure?', action: 'Delete' }

    it('resolves with the user decision', async () => {
        const pending = confirmAction(options)
        expect(useConfirmRequest().value).toMatchObject(options)
        settleConfirm(true)
        await expect(pending).resolves.toBe(true)
        expect(useConfirmRequest().value).toBeNull()
    })

    it('cancels a previous request when a new one starts', async () => {
        const first = confirmAction(options)
        const second = confirmAction({ ...options, title: 'Second' })
        await expect(first).resolves.toBe(false)
        settleConfirm(false)
        await expect(second).resolves.toBe(false)
    })
})
