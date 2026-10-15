import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { Storyblok, StoryblokStory, StoryContent } from '#types/storyblok'
import { BLOG } from '../../shared/blog'
import { MAX_LENGTH } from '../../shared/validation'
import { toStory, toStorySummary, toStoryVersion } from '../dto'
import { slugCandidates } from '../slug'
import { StoryblokError } from '../storyblok'
import { idParam, pageQuery, searchQuery, validate } from '../validate'

const STORIES_PER_PAGE = 24

const SLUG_ATTEMPTS = 3

const titleBody = z.object({ title: z.string().trim().min(1).max(MAX_LENGTH.storyName) })

const listQuery = z.object({
    page: pageQuery,
    search: searchQuery,
    status: z.enum(['all', 'published', 'draft']).default('all'),
})

const storyBody = z.object({
    content: z.looseObject({ component: z.literal(BLOG.component) }),
    publish: z.boolean().default(false),
})

const versionParam = idParam.extend({ versionId: z.coerce.number().int().positive() })

const today = () => new Date().toISOString().slice(0, 10)

const titleOf = (content: Record<string, unknown> = {}) => {
    const title = content[BLOG.fields.title]
    return typeof title === 'string'
        ? [...title.trim()].slice(0, MAX_LENGTH.storyName).join('')
        : ''
}

const parentPath = (story: StoryblokStory) =>
    story.full_slug.slice(0, story.full_slug.lastIndexOf('/'))

const isLive = (story: StoryblokStory) => !!(story.published || story.first_published_at)

const followsTitle = (story: StoryblokStory, title: string) =>
    story.name === title && (isLive(story) || slugCandidates(title).includes(story.slug))

const isSlugTaken = (error: unknown) =>
    error instanceof StoryblokError && error.status === 422 && /slug/i.test(error.message)

const saveWithSlug = async (
    storyblok: Storyblok,
    { title, folder, story }: { title: string; folder: string; story?: StoryblokStory },
    save: (slug: string) => Promise<StoryblokStory>
) => {
    const candidates = slugCandidates(title)
    if (story && story.slug === candidates[0]) return save(story.slug)
    const { data } = await storyblok.listStories({
        by_slugs: candidates.map((slug) => `${folder}/${slug}`).join(','),
        per_page: candidates.length,
    })
    const taken = new Set(data.stories.filter(({ id }) => id !== story?.id).map(({ slug }) => slug))
    const free = candidates.filter((candidate) => !taken.has(candidate))
    for (const slug of free.slice(0, SLUG_ATTEMPTS)) {
        try {
            return await save(slug)
        } catch (error) {
            if (!isSlugTaken(error)) throw error
        }
    }
    throw new HTTPException(409, { message: 'Too many posts share this title' })
}

const saveStory = (
    storyblok: Storyblok,
    story: StoryblokStory,
    content: StoryContent,
    publish: boolean
) => {
    const title = titleOf(content)
    const save = (slug: string) =>
        storyblok.updateStory(story.id, { name: title || story.name, slug, content }, publish)
    return title && !isLive(story)
        ? saveWithSlug(storyblok, { title, folder: parentPath(story), story }, save)
        : save(story.slug)
}

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
        .post('/', validate('json', titleBody), async (c) => {
            const { title } = c.req.valid('json')
            const folder = await storyblok.findFolder(BLOG.folder)
            if (!folder) throw new HTTPException(500, { message: 'Blog folder not found' })
            const story = await saveWithSlug(
                storyblok,
                { title, folder: folder.full_slug },
                (slug) =>
                    storyblok.createStory({
                        name: title,
                        slug,
                        parent_id: folder.id,
                        content: {
                            component: BLOG.component,
                            [BLOG.fields.title]: title,
                            [BLOG.fields.date]: today(),
                        },
                    })
            )
            return c.json({ id: story.id }, 201)
        })
        .get('/:id', validate('param', idParam), async (c) => {
            const story = await findBlogStory(storyblok, c.req.valid('param').id)
            return c.json(toStory(story, siteUrl))
        })
        .put('/:id', validate('param', idParam), validate('json', storyBody), async (c) => {
            const { id } = c.req.valid('param')
            const { content, publish } = c.req.valid('json')
            const story = await findBlogStory(storyblok, id)
            const updated = await saveStory(storyblok, story, content, publish)
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
            const restored = await findBlogStory(storyblok, id)
            const title = titleOf(restored.content)
            if (title && !followsTitle(restored, title)) {
                const content = { ...restored.content, component: BLOG.component }
                await saveStory(storyblok, restored, content, false)
            }
            return c.body(null, 204)
        })
        .post(
            '/:id/duplicate',
            validate('param', idParam),
            validate('json', titleBody),
            async (c) => {
                const { id } = c.req.valid('param')
                const { title } = c.req.valid('json')
                const source = await findBlogStory(storyblok, id)
                const story = await saveWithSlug(
                    storyblok,
                    { title, folder: parentPath(source) },
                    (slug) =>
                        storyblok.createStory({
                            name: title,
                            slug,
                            parent_id: source.parent_id,
                            content: {
                                ...source.content,
                                component: BLOG.component,
                                [BLOG.fields.title]: title,
                            },
                        })
                )
                return c.json({ id: story.id }, 201)
            }
        )
