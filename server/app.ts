import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { csrf } from 'hono/csrf'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Env } from '#types/server'
import { assetRoutes } from './routes/assets'
import { folderRoutes } from './routes/folders'
import { schemaRoutes } from './routes/schema'
import { storyRoutes } from './routes/stories'
import { createSession } from './session'
import { createStoryblok, StoryblokError } from './storyblok'

const FORWARDED_STATUSES = new Set([404, 409, 422, 429])

const upstreamStatus = (status: number): ContentfulStatusCode =>
    FORWARDED_STATUSES.has(status) ? (status as ContentfulStatusCode) : 502

export const createApp = (env: Env, fetch: typeof globalThis.fetch = globalThis.fetch) => {
    const storyblok = createStoryblok({
        apiUrl: env.STORY_API_URL,
        cdnUrl: env.STORY_CDN_URL,
        spaceId: env.STORY_ID_SPACE,
        token: env.STORY_OAUTH_TOKEN,
        fetch,
    })

    const session = createSession(env)

    const app = new Hono({ getPath: (request) => new URL(request.url).pathname })
        .basePath('/api')
        .use(csrf())
        .route('/session', session.routes)
        .use(session.requireSession)
        .route('/stories', storyRoutes(storyblok, env.STORY_DOMAIN_PRO))
        .route('/assets', assetRoutes(storyblok))
        .route('/folders', folderRoutes(storyblok))
        .route('/schema', schemaRoutes(storyblok))

    app.notFound((c) => c.json({ error: 'Not found' }, 404))

    app.onError((error, c) => {
        if (error instanceof HTTPException) {
            return c.json({ error: error.message || 'Request rejected' }, error.status)
        }
        if (error instanceof StoryblokError) {
            return c.json({ error: error.message }, upstreamStatus(error.status))
        }
        console.error(error)
        return c.json({ error: 'Unexpected server error' }, 500)
    })

    return app
}
