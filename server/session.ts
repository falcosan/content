import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import type { Env } from './env'
import { validate } from './validate'

export const SESSION_COOKIE = 'session'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

const sha256 = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))

const fromHex = (hex: string) =>
    Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))

const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const constantTimeEqual = (a: Uint8Array, b: Uint8Array) =>
    a.length === b.length &&
    a.reduce((diff, byte, index) => diff | (byte ^ (b[index] ?? 0)), 0) === 0

export const verifyCredentials = async (env: Env, user: string, password: string) => {
    const [givenUser, expectedUser, givenPassword] = await Promise.all([
        sha256(user.trim().toLowerCase()),
        sha256(env.STORY_AUTH_EMAIL.toLowerCase()),
        sha256(password),
    ])
    const userMatches = constantTimeEqual(givenUser, expectedUser)
    const passwordMatches = constantTimeEqual(givenPassword, fromHex(env.STORY_AUTH_PASSWORD))
    return userMatches && passwordMatches
}

export const deriveSessionKey = async (env: Env) => {
    const material = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.STORY_OAUTH_TOKEN),
        'HKDF',
        false,
        ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: fromHex(env.STORY_AUTH_PASSWORD),
            info: encoder.encode('aprograma-editor/session'),
        },
        material,
        256
    )
    return toHex(new Uint8Array(bits))
}

const cookieOptions = (c: Context) =>
    ({
        httpOnly: true,
        secure: new URL(c.req.url).protocol === 'https:',
        sameSite: 'Strict',
        path: '/api',
    }) as const

const credentials = z.object({
    user: z.string().trim().min(1).max(320),
    password: z.string().min(1).max(1024),
})

export type SessionVariables = { user: string }

export const createSession = (env: Env) => {
    const key = deriveSessionKey(env)

    const readUser = async (c: Context) => {
        const token = getCookie(c, SESSION_COOKIE)
        if (!token) throw new HTTPException(401, { message: 'Not signed in' })
        const payload = await verify(token, await key, 'HS256').catch(() => null)
        if (typeof payload?.sub !== 'string') {
            throw new HTTPException(401, { message: 'Session expired' })
        }
        return payload.sub
    }

    const requireSession = createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
        c.set('user', await readUser(c))
        await next()
    })

    const view = (user: string) => ({ user, siteUrl: env.STORY_DOMAIN_PRO })

    const routes = new Hono<{ Variables: SessionVariables }>()
        .get('/', requireSession, (c) => c.json(view(c.get('user'))))
        .post('/', validate('json', credentials), async (c) => {
            const { user, password } = c.req.valid('json')
            if (!(await verifyCredentials(env, user, password))) {
                return c.json({ error: 'Invalid credentials' }, 401)
            }
            const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
            const token = await sign({ sub: env.STORY_AUTH_EMAIL, exp }, await key, 'HS256')
            setCookie(c, SESSION_COOKIE, token, {
                ...cookieOptions(c),
                maxAge: SESSION_TTL_SECONDS,
            })
            return c.json(view(env.STORY_AUTH_EMAIL))
        })
        .delete('/', (c) => {
            deleteCookie(c, SESSION_COOKIE, cookieOptions(c))
            return c.body(null, 204)
        })

    return { requireSession, routes }
}
