import { createHash } from 'node:crypto'
import { sign } from 'hono/jwt'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../server/app'
import { deriveSessionKey, verifyCredentials } from '../../server/session'
import { createTestApp, PASSWORD, signIn, testEnv } from './fakes'

const post = (body: unknown, url = '/api/session') => ({
    url,
    init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    },
})

describe('verifyCredentials', () => {
    it('accepts the configured user case-insensitively', async () => {
        await expect(verifyCredentials(testEnv, 'Editor@Example.com', PASSWORD)).resolves.toBe(true)
    })

    it('rejects a wrong user or password', async () => {
        await expect(verifyCredentials(testEnv, 'someone', PASSWORD)).resolves.toBe(false)
        await expect(verifyCredentials(testEnv, testEnv.STORY_AUTH_EMAIL, 'nope')).resolves.toBe(
            false
        )
    })
})

describe('session routes', () => {
    it('signs in and sets a hardened session cookie', async () => {
        const { app } = createTestApp()
        const { url, init } = post(
            { user: testEnv.STORY_AUTH_EMAIL, password: PASSWORD },
            'https://editor.test/api/session'
        )
        const response = await app.request(url, init)
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ siteUrl: testEnv.STORY_DOMAIN_PRO })
        const cookie = response.headers.get('set-cookie') ?? ''
        expect(cookie).toMatch(/^session=[\w-]+\.[\w-]+\.[\w-]+;/)
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('Secure')
        expect(cookie).toContain('SameSite=Strict')
        expect(cookie).toContain('Path=/api')
        expect(cookie).toContain('Max-Age=604800')
    })

    it('trims the user name before checking it', async () => {
        const { app } = createTestApp()
        const { url, init } = post({ user: ' Editor@Example.com ', password: PASSWORD })
        const response = await app.request(url, init)
        expect(response.status).toBe(200)
    })

    it('routes only the canonical session path, which the rate limit covers', async () => {
        const { app } = createTestApp()
        const { url, init } = post(
            { user: testEnv.STORY_AUTH_EMAIL, password: PASSWORD },
            '/api/%73ession'
        )
        const response = await app.request(url, init)
        expect(response.status).toBe(401)
        expect(response.headers.get('set-cookie')).toBeNull()
    })

    it('omits the Secure flag on plain http for local development', async () => {
        const { app } = createTestApp()
        const { url, init } = post({ user: testEnv.STORY_AUTH_EMAIL, password: PASSWORD })
        const response = await app.request(url, init)
        expect(response.headers.get('set-cookie')).not.toContain('Secure')
    })

    it('rejects invalid credentials without a cookie', async () => {
        const { app } = createTestApp()
        const { url, init } = post({ user: testEnv.STORY_AUTH_EMAIL, password: 'wrong' })
        const response = await app.request(url, init)
        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ error: 'Invalid credentials' })
        expect(response.headers.get('set-cookie')).toBeNull()
    })

    it('validates the request body', async () => {
        const { app } = createTestApp()
        const { url, init } = post({ user: '' })
        const response = await app.request(url, init)
        expect(response.status).toBe(400)
        expect(await response.json()).toHaveProperty('error')
    })

    it('reports the current session', async () => {
        const { app } = createTestApp()
        const cookie = await signIn(app)
        const response = await app.request('/api/session', { headers: { Cookie: cookie } })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ siteUrl: testEnv.STORY_DOMAIN_PRO })
    })

    it('rejects missing, forged and expired sessions', async () => {
        const { app } = createTestApp()
        const forged = await sign(
            { exp: Math.floor(Date.now() / 1000) + 60 },
            'not-the-secret',
            'HS256'
        )
        const expired = await sign(
            { exp: Math.floor(Date.now() / 1000) - 60 },
            await deriveSessionKey(testEnv),
            'HS256'
        )
        const cases: HeadersInit[] = [
            {},
            { Cookie: `session=${forged}` },
            { Cookie: `session=${expired}` },
        ]
        for (const headers of cases) {
            const response = await app.request('/api/session', { headers })
            expect(response.status).toBe(401)
        }
    })

    it('signs out by expiring the cookie', async () => {
        const { app } = createTestApp()
        const response = await app.request('/api/session', {
            method: 'DELETE',
            headers: { Origin: 'http://localhost', 'Sec-Fetch-Site': 'same-origin' },
        })
        expect(response.status).toBe(204)
        expect(response.headers.get('set-cookie')).toMatch(/^session=;.*Max-Age=0/)
    })

    it('protects every content route', async () => {
        const { app, calls } = createTestApp()
        for (const route of ['/api/stories', '/api/assets', '/api/folders', '/api/schema/fields']) {
            const response = await app.request(route)
            expect(response.status).toBe(401)
        }
        expect(calls).toHaveLength(0)
    })

    it('blocks cross-site form submissions', async () => {
        const { app } = createTestApp()
        const response = await app.request('https://editor.test/api/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Origin: 'https://evil.test',
            },
            body: 'user=a&password=b',
        })
        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: 'Request rejected' })
    })

    it('rejects body-less mutations without same-origin proof', async () => {
        const { app } = createTestApp()
        const response = await app.request('/api/session', { method: 'DELETE' })
        expect(response.status).toBe(403)
    })

    it('derives a stable signing key that rotates with the credentials', async () => {
        const key = await deriveSessionKey(testEnv)
        expect(key).toMatch(/^[a-f0-9]{64}$/)
        await expect(deriveSessionKey({ ...testEnv })).resolves.toBe(key)
        await expect(
            deriveSessionKey({ ...testEnv, STORY_OAUTH_TOKEN: 'rotated-token' })
        ).resolves.not.toBe(key)
    })

    it('signs everyone out when the password changes', async () => {
        const { app } = createTestApp()
        const cookie = await signIn(app)
        const rotated = createApp({
            ...testEnv,
            STORY_AUTH_PASSWORD: createHash('sha256').update('new password').digest('hex'),
        })
        const response = await rotated.request('/api/session', { headers: { Cookie: cookie } })
        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ error: 'Session expired' })
    })
})
