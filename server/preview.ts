import { sign, verify } from 'hono/jwt'
import type { Env } from '#types/server'
import { deriveKey } from './session'

export const createPreviewTokens = (env: Env) => {
    const key = deriveKey(env, 'preview')
    return {
        issue: async (id: number) => sign({ id }, await key),
        read: async (token: string) => {
            const payload = await verify(token, await key, 'HS256').catch(() => null)
            return typeof payload?.id === 'number' ? payload.id : null
        },
    }
}

export type PreviewTokens = ReturnType<typeof createPreviewTokens>
