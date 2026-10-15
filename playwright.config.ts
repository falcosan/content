import { createHash } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'
import { E2E } from './tests/e2e/config'

export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    use: {
        baseURL: E2E.appUrl,
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: 'node tests/e2e/mock-storyblok.ts',
            url: `${E2E.mockUrl}/__state`,
        },
        {
            command: `vite --port ${E2E.appPort} --strictPort`,
            url: E2E.appUrl,
            env: {
                STORY_ID_SPACE: String(E2E.space),
                STORY_OAUTH_TOKEN: E2E.token,
                STORY_AUTH_EMAIL: E2E.user,
                STORY_AUTH_PASSWORD: createHash('sha256').update(E2E.password).digest('hex'),
                STORY_DOMAIN_PRO: E2E.siteUrl,
                STORY_API_URL: `${E2E.mockUrl}/v1`,
                STORY_CDN_URL: `${E2E.mockUrl}/v2/cdn`,
            },
        },
    ],
})
