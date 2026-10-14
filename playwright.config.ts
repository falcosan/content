import { createHash } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'
import { E2E } from './e2e/config'

export default defineConfig({
    testDir: 'e2e',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: E2E.appUrl,
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: 'node e2e/mock-storyblok.ts',
            url: `${E2E.mockUrl}/__state`,
            env: { MOCK_PORT: String(E2E.mockPort), MOCK_TOKEN: E2E.token, MOCK_SPACE: '1' },
            reuseExistingServer: false,
        },
        {
            command: `vite --port ${E2E.appPort} --strictPort`,
            url: E2E.appUrl,
            reuseExistingServer: false,
            env: {
                STORY_ID_SPACE: '1',
                STORY_OAUTH_TOKEN: E2E.token,
                STORY_AUTH_EMAIL: E2E.user,
                STORY_AUTH_PASSWORD: createHash('sha256').update(E2E.password).digest('hex'),
                STORY_DOMAIN_PRO: 'https://site.test/',
                STORY_API_URL: `${E2E.mockUrl}/v1`,
            },
        },
    ],
})
