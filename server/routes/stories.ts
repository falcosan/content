import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { Storyblok } from '#types/storyblok'
import { BLOG } from '../../shared/blog'
import { MAX_LENGTH, SLUG } from '../../shared/validation'
import { toStory, toStorySummary, toStoryVersion } from '../dto'
import { idParam, pageQuery, searchQuery, validate } from '../validate'

const STORIES_PER_PAGE = 24

const slug = z
    .string()
    .trim()
    .min(1)
    .max(MAX_LENGTH.slug)
    .regex(SLUG, 'Use lowercase letters, numbers and single hyphens')

const identity = z.object({
    name: z.string().trim().min(1).max(MAX_LENGTH.storyName),
    slug,
})

const listQuery = z.object({
    page: pageQuery,
    search: searchQuery,
    status: z.enum(['all', 'published', 'draft']).default('all'),
})

const storyBody = identity.extend({
    content: z.looseObject({ component: z.literal(BLOG.component) }),
    publish: z.boolean().default(false),
})

const versionParam = idParam.extend({ versionId: z.coerce.number().int().positive() })

const translateBody = z.object({ language: z.string().trim().min(1).max(20) })

const today = () => new Date().toISOString().slice(0, 10)

const findBlogStory = async (storyblok: Storyblok, id: number) => {
    const story = await storyblok.getStory(id)
    if (
        story.deleted_at ||
        !story.full_slug.startsWith(`${BLOG.folder}/`) ||
        story.content?.component !== BLOG.component
    ) {
        throw new HTTPException(404, { message: 'Story not found' })
    }
    return story
}

export const storyRoutes = (storyblok: Storyblok, siteUrl: string) =>
    new Hono()
        .get('/', validate('query', listQuery), async (c) => {
            const { page, search, status } = c.req.valid('query')
            const { data, total } = await storyblok.listStories({
                starts_with: `${BLOG.folder}/`,
                story_only: 1,
                sort_by: `content.${BLOG.fields.date}:desc`,
                per_page: STORIES_PER_PAGE,
                page,
                text_search: search,
                is_published: status === 'all' ? undefined : status === 'published',
            })
            const contents = await storyblok.listStoryContents(data.stories.map(({ id }) => id))
            const contentById = new Map(contents.map(({ id, content }) => [id, content]))
            return c.json({
                stories: data.stories.map((story) =>
                    toStorySummary(story, contentById.get(story.id))
                ),
                total,
                page,
                perPage: STORIES_PER_PAGE,
            })
        })
        .post('/', validate('json', identity), async (c) => {
            const { name, slug } = c.req.valid('json')
            const folder = await storyblok.findFolder(BLOG.folder)
            if (!folder) throw new HTTPException(500, { message: 'Blog folder not found' })
            const story = await storyblok.createStory({
                name,
                slug,
                parent_id: folder.id,
                content: {
                    component: BLOG.component,
                    [BLOG.fields.title]: name,
                    [BLOG.fields.date]: today(),
                },
            })
            return c.json({ id: story.id }, 201)
        })
        .get('/:id', validate('param', idParam), async (c) => {
            const story = await findBlogStory(storyblok, c.req.valid('param').id)
            return c.json(toStory(story, siteUrl))
        })
        .put('/:id', validate('param', idParam), validate('json', storyBody), async (c) => {
            const { id } = c.req.valid('param')
            const { publish, ...story } = c.req.valid('json')
            await findBlogStory(storyblok, id)
            const updated = await storyblok.updateStory(id, story, publish)
            return c.json(toStory(updated, siteUrl))
        })
        .delete('/:id', validate('param', idParam), async (c) => {
            const { id } = c.req.valid('param')
            await findBlogStory(storyblok, id)
            await storyblok.deleteStory(id)
            return c.body(null, 204)
        })
        .post('/:id/unpublish', validate('param', idParam), async (c) => {
            const { id } = c.req.valid('param')
            await findBlogStory(storyblok, id)
            await storyblok.unpublishStory(id)
            return c.body(null, 204)
        })
        .get('/:id/versions', validate('param', idParam), async (c) => {
            const { id } = c.req.valid('param')
            await findBlogStory(storyblok, id)
            const versions = await storyblok.listStoryVersions(id)
            return c.json(
                versions.map(toStoryVersion).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            )
        })
        .post('/:id/versions/:versionId/restore', validate('param', versionParam), async (c) => {
            const { id, versionId } = c.req.valid('param')
            await findBlogStory(storyblok, id)
            await storyblok.restoreStoryVersion(id, versionId)
            return c.body(null, 204)
        })
        .post(
            '/:id/translate',
            validate('param', idParam),
            validate('json', translateBody),
            async (c) => {
                const { id } = c.req.valid('param')
                const { language: code } = c.req.valid('json')
                await findBlogStory(storyblok, id)
                const space = await storyblok.getSpace()
                const language = space.languages?.find((candidate) => candidate.code === code)
                if (!language) throw new HTTPException(404, { message: 'Language not found' })
                const story = await storyblok.translateStory(
                    id,
                    code,
                    language.ai_translation_code ?? code
                )
                const suffix = `__i18n__${code}`
                return c.json({
                    content: Object.fromEntries(
                        Object.entries(story.content ?? {}).filter(([key]) => key.endsWith(suffix))
                    ),
                })
            }
        )
        .post(
            '/:id/duplicate',
            validate('param', idParam),
            validate('json', identity),
            async (c) => {
                const { id } = c.req.valid('param')
                await findBlogStory(storyblok, id)
                const story = await storyblok.duplicateStory(id, c.req.valid('json'))
                return c.json({ id: story.id }, 201)
            }
        )
