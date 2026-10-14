import { test as base, expect, type Page } from '@playwright/test'
import { E2E } from './config'

const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
    'base64'
)

export interface StorageUpload {
    fields: Record<string, string>
    fileName: string
}

interface MockState {
    stories: {
        id: number
        name: string
        slug: string
        published: boolean
        unpublished_changes: boolean
        tag_list: string[]
        stage: { workflow_stage_id: number } | null
        content: Record<string, unknown>
    }[]
    assets: {
        id: number
        short_filename: string
        alt: string
        title: string
        asset_folder_id: number | null
        deleted_at: string | null
        finished: boolean
    }[]
    folders: { id: number; name: string; parent_id: number | null }[]
}

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
    mock: { state: () => Promise<MockState> }
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
            await use({
                state: async () =>
                    (await request.get(`${E2E.mockUrl}/__state`)).json() as Promise<MockState>,
            })
        },
        { auto: true },
    ],
})

export { expect }

export const signIn = async (page: Page, path = '/') => {
    await page.goto(path)
    await page.getByLabel('Email or username').fill(E2E.user)
    await page.getByLabel('Password').fill(E2E.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => url.pathname !== '/login')
}

export const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PIXEL })
