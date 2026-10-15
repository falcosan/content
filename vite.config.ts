import devServer from '@hono/vite-dev-server'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const SECURITY_HEADERS = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        'frame-src https:',
        "connect-src 'self' https://s3.amazonaws.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const headerRules = (rules: Record<string, Record<string, string>>) =>
    Object.entries(rules)
        .map(([path, headers]) =>
            [path, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join(
                '\n'
            )
        )
        .join('\n')

const netlifyHeaders = (): Plugin => ({
    name: 'netlify-headers',
    apply: 'build',
    generateBundle() {
        this.emitFile({
            type: 'asset',
            fileName: '_headers',
            source: `${headerRules({
                '/*': SECURITY_HEADERS,
                '/assets/*': { 'Cache-Control': 'public, max-age=31536000, immutable' },
            })}\n`,
        })
    },
})

export default defineConfig(({ mode }) => {
    Object.assign(process.env, loadEnv(mode, process.cwd(), 'STORY_'))

    return {
        plugins: [
            vue(),
            tailwindcss(),
            netlifyHeaders(),
            ...(process.env.VITEST
                ? []
                : [
                      devServer({
                          entry: 'server/netlify.ts',
                          export: 'app',
                          exclude: [/^(?!\/api(?:\/|$))/],
                          injectClientScript: false,
                      }),
                  ]),
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: { headers: SECURITY_HEADERS },
        test: {
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'server',
                        environment: 'node',
                        include: ['tests/server/**/*.test.ts'],
                    },
                },
                {
                    extends: true,
                    test: {
                        name: 'web',
                        environment: 'jsdom',
                        include: ['tests/web/**/*.test.ts'],
                    },
                },
            ],
        },
    }
})
