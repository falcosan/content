import type { Config } from '@netlify/functions'

export { default } from '../../server/netlify'

export const config: Config = {
    path: '/api/*',
    excludedPath: '/api/session',
}
