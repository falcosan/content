import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { BLOG } from '../../shared/blog'
import { toStory, toStorySummary, toStoryVersion } from '../dto'
import type { Storyblok, StoryblokStory } from '../storyblok'
import { idParam, pageQuery, searchQuery, validate } from '../validate'

const STORIES_PER_PAGE = 24

const slug = z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens')

const identity = z.object({
    name: z.string().trim().min(1).max(255),
    slug,
})

const listQuery = z.object({
    page: pageQuery,
    search: searchQuery,
    status: z.enum(['all', 'published', 'draft']).default('all'),
})

const storyBody = identity.extend({
    tags: z.array(z.string().trim().min(1).max(100)).max(50),
    content: z.looseObject({ component: z.literal(BLOG.component) }),
    publish: z.boolean().default(false),
})

const versionParam = idParam.extend({ versionId: z.coerce.number().int().positive() })

const stageBody = z.object({ stageId: z.number().int().positive() })

const translateBody = z.object({ language: z.string().trim().min(1).max(20) })

const today = () => new Date().toISOString().slice(0, 10)

const assertBlogStory = (story: StoryblokStory) => {
    if (story.deleted_at || !story.full_slug.startsWith(`${BLOG.folder}/`)) {
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
                with_summary: 1,
                sort_by: `content.${BLOG.fields.date}:desc`,
                per_page: STORIES_PER_PAGE,
                page,
                text_search: search,
                is_published: status === 'all' ? undefined : status === 'published',
            })
            return c.json({
                stories: data.stories.map(toStorySummary),
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
            const story = assertBlogStory(await storyblok.getStory(c.req.valid('param').id))
            return c.json(toStory(story, siteUrl))
        })
        .put('/:id', validate('param', idParam), validate('json', storyBody), async (c) => {
            const { tags, publish, ...story } = c.req.valid('json')
            const updated = await storyblok.updateStory(
                c.req.valid('param').id,
                { ...story, tag_list: tags },
                publish
            )
            return c.json(toStory(updated, siteUrl))
        })
        .delete('/:id', validate('param', idParam), async (c) => {
            await storyblok.deleteStory(c.req.valid('param').id)
            return c.body(null, 204)
        })
        .post('/:id/unpublish', validate('param', idParam), async (c) => {
            await storyblok.unpublishStory(c.req.valid('param').id)
            return c.body(null, 204)
        })
        .get('/:id/versions', validate('param', idParam), async (c) => {
            const versions = await storyblok.listStoryVersions(c.req.valid('param').id)
            return c.json(
                versions.map(toStoryVersion).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            )
        })
        .post('/:id/versions/:versionId/restore', validate('param', versionParam), async (c) => {
            const { id, versionId } = c.req.valid('param')
            await storyblok.restoreStoryVersion(id, versionId)
            return c.body(null, 204)
        })
        .post(
            '/:id/translate',
            validate('param', idParam),
            validate('json', translateBody),
            async (c) => {
                const { language: code } = c.req.valid('json')
                const space = await storyblok.getSpace()
                const language = space.languages?.find((candidate) => candidate.code === code)
                if (!language) throw new HTTPException(404, { message: 'Language not found' })
                const story = await storyblok.translateStory(c.req.valid('param').id, language)
                const suffix = `__i18n__${code}`
                return c.json({
                    content: Object.fromEntries(
                        Object.entries(story.content ?? {}).filter(([key]) => key.endsWith(suffix))
                    ),
                })
            }
        )
        .post('/:id/stage', validate('param', idParam), validate('json', stageBody), async (c) => {
            await storyblok.changeWorkflowStage(
                c.req.valid('param').id,
                c.req.valid('json').stageId
            )
            return c.body(null, 204)
        })
        .post(
            '/:id/duplicate',
            validate('param', idParam),
            validate('json', identity),
            async (c) => {
                const story = await storyblok.duplicateStory(
                    c.req.valid('param').id,
                    c.req.valid('json')
                )
                return c.json({ id: story.id }, 201)
            }
        )
