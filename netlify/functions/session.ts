import type { Config } from '@netlify/functions'

export { default } from '../../server/netlify'

export const config: Config = {
    path: '/api/session',
    rateLimit: {
        windowSize: 60,
        windowLimit: 20,
        aggregateBy: ['ip', 'domain'],
    },
}
