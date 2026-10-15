import { test as base, expect, type Locator, type Page } from '@playwright/test'
import type { MockState, MockStory, StorageUpload } from '#types/tests'
import { E2E } from './config'

const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
    'base64'
)

const parseMultipart = (body: Buffer, contentType: string): StorageUpload => {
    const boundary = /boundary=(.+)$/.exec(contentType)?.[1] ?? ''
    const fields: Record<string, string> = {}
    let fileName = ''
    for (const part of body.toString('latin1').split(`--${boundary}`)) {
        const name = /name="([^"]+)"/.exec(part)?.[1]
        if (!name) continue
        const file = /filename="([^"]*)"/.exec(part)?.[1]
        if (file !== undefined) fileName = file
        else fields[name] = part.split('\r\n\r\n')[1]?.replace(/\r\n$/, '') ?? ''
    }
    return { fields, fileName }
}

export const test = base.extend<{
    storage: StorageUpload[]
    mock: { state: () => Promise<MockState>; story: (id: number) => Promise<MockStory> }
}>({
    storage: [
        async ({ context }, use) => {
            const uploads: StorageUpload[] = []
            await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort())
            await context.route('https://a.storyblok.com/**', (route) =>
                route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
            )
            await context.route('https://s3.amazonaws.com/**', async (route) => {
                const request = route.request()
                uploads.push(
                    parseMultipart(
                        request.postDataBuffer() ?? Buffer.alloc(0),
                        request.headers()['content-type'] ?? ''
                    )
                )
                await route.fulfill({
                    status: 204,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                })
            })
            await use(uploads)
        },
        { auto: true },
    ],
    mock: [
        async ({ request }, use) => {
            await request.post(`${E2E.mockUrl}/__reset`)
            const state = async () =>
                (await request.get(`${E2E.mockUrl}/__state`)).json() as Promise<MockState>
            const story = async (id: number) => {
                const found = (await state()).stories.find((candidate) => candidate.id === id)
                if (!found) throw new Error(`Story ${id} is not in the mock`)
                return found
            }
            await use({ state, story })
        },
        { auto: true },
    ],
})

export { expect }

export const submitCredentials = async (scope: Page | Locator, password = E2E.password) => {
    await scope.getByLabel('Email or username').fill(E2E.user)
    await scope.getByLabel('Password').fill(password)
    await scope.getByRole('button', { name: 'Sign in' }).click()
}

export const signIn = async (page: Page, path = '/') => {
    await page.goto(path)
    await submitCredentials(page)
    await page.waitForURL((url) => url.pathname !== '/login')
}

export const hold = async (page: Page, match: Parameters<Page['route']>[0]) => {
    const { promise, resolve } = Promise.withResolvers<void>()
    await page.route(match, async (route) => {
        await promise
        await route.continue()
    })
    return resolve
}

export const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PIXEL })

export const fileTransfer = (page: Page, name: string) =>
    page.evaluateHandle(
        ([data, fileName]) => {
            const dataTransfer = new DataTransfer()
            const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
            dataTransfer.items.add(new File([bytes], fileName, { type: 'image/png' }))
            return dataTransfer
        },
        [PIXEL.toString('base64'), name] as const
    )
