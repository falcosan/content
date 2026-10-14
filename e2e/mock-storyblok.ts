import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const PORT = Number(process.env.MOCK_PORT ?? 4010)
const TOKEN = process.env.MOCK_TOKEN ?? 'e2e-token'
const SPACE = `/v1/spaces/${process.env.MOCK_SPACE ?? '1'}/`

type Content = Record<string, unknown> & { component: string }

interface Story {
    id: number
    name: string
    slug: string
    full_slug: string
    parent_id: number | null
    is_folder: boolean
    published: boolean
    unpublished_changes: boolean
    created_at: string
    updated_at: string
    first_published_at: string | null
    tag_list: string[]
    stage: { workflow_stage_id: number } | null
    content: Content
}

interface Version {
    id: number
    story_id: number
    created_at: string
    status: string
    name: string
    content: Content
}

interface Asset {
    id: number
    filename: string
    short_filename: string
    content_type: string
    content_length: number
    alt: string
    title: string
    copyright: string
    source: string
    asset_folder_id: number | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    finished: boolean
}

interface Folder {
    id: number
    name: string
    parent_id: number | null
}

interface State {
    stories: Story[]
    assets: Asset[]
    folders: Folder[]
    versions: Version[]
    nextId: number
}

const emptyAsset = {
    id: null,
    alt: '',
    name: '',
    focus: '',
    title: '',
    source: '',
    filename: '',
    copyright: '',
    fieldtype: 'asset',
    meta_data: {},
    is_external_url: false,
}

const timestamp = (day: number) => new Date(Date.UTC(2025, 0, day, 10)).toISOString()

const post = (
    id: number,
    name: string,
    slug: string,
    date: string,
    published: boolean,
    unpublished_changes = false
): Story => ({
    id,
    name,
    slug,
    full_slug: `blog/${slug}`,
    parent_id: 1,
    is_folder: false,
    published,
    unpublished_changes,
    created_at: timestamp(1),
    updated_at: timestamp(2),
    first_published_at: published ? timestamp(1) : null,
    tag_list: [],
    stage: null,
    content: {
        component: 'Post',
        _uid: `uid-${id}`,
        title: name,
        intro: `Intro of ${name}`,
        date,
        long_text: '<p>Hello <strong>world</strong></p>',
        file: emptyAsset,
        categories: [],
        author: '',
    },
})

const asset = (id: number, name: string, folder: number | null, day: number): Asset => ({
    id,
    filename: `https://s3.amazonaws.com/a.storyblok.com/f/1/800x600/${id}/${name}`,
    short_filename: name,
    content_type: 'image/png',
    content_length: 2048,
    alt: '',
    title: '',
    copyright: '',
    source: '',
    asset_folder_id: folder,
    created_at: timestamp(day),
    updated_at: timestamp(day),
    deleted_at: null,
    finished: true,
})

const seed = (): State => ({
    stories: [
        {
            ...post(1, 'Blog', 'blog', '', false),
            full_slug: 'blog',
            parent_id: null,
            is_folder: true,
        },
        post(101, 'First post', 'first-post', '2025-02-01', true),
        post(102, 'Draft post', 'draft-post', '2025-03-01', false),
        post(103, 'Changed post', 'changed-post', '2025-01-15', true, true),
        { ...post(200, 'Home', 'home', '', true), full_slug: 'home', parent_id: null },
    ],
    assets: [
        asset(301, 'cover.png', null, 5),
        asset(302, 'diagram.png', 401, 4),
        { ...asset(303, 'old.png', null, 3), deleted_at: timestamp(6) },
    ],
    folders: [{ id: 401, name: 'Diagrams', parent_id: null }],
    versions: [
        {
            id: 901,
            story_id: 101,
            created_at: timestamp(1),
            status: 'published',
            name: 'First post',
            content: {
                ...post(101, 'First post', 'first-post', '2025-02-01', true).content,
                title: 'Original title',
            },
        },
    ],
    nextId: 1000,
})

let state = seed()

const options = (names: string[]) =>
    names.map((name) => ({ _uid: name, name, value: name.toLowerCase() }))

const components = [
    {
        name: 'Post',
        schema: {
            file: { type: 'asset', pos: 0, filetypes: ['images'] },
            categories: {
                type: 'options',
                pos: 1,
                max_options: '2',
                options: options(['Vue', 'Rust', 'Design']),
            },
            author: { type: 'option', pos: 2, options: options(['Daniele']) },
            title: { type: 'text', pos: 4, required: true, max_length: '48', translatable: true },
            date: { type: 'datetime', pos: 5, required: true, disable_time: true },
            intro: { type: 'textarea', pos: 6, required: true, translatable: true },
            long_text: { type: 'markdown', pos: 7, required: true, translatable: true },
            text_color: { type: 'custom', pos: 8 },
        },
    },
]

const send = (response: ServerResponse, status: number, body?: unknown, headers = {}) => {
    response.writeHead(status, {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
    })
    response.end(body === undefined ? undefined : JSON.stringify(body))
}

const readJson = async (request: IncomingMessage) => {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk as Buffer)
    const text = Buffer.concat(chunks).toString()
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
}

const notFound = (response: ServerResponse) =>
    send(response, 404, ['This record could not be found'])

const paginate = <T>(items: T[], query: URLSearchParams) => {
    const page = Number(query.get('page') ?? 1)
    const perPage = Number(query.get('per_page') ?? 25)
    return items.slice((page - 1) * perPage, page * perPage)
}

const summary = (story: Story) => {
    const { content, ...rest } = story
    return { ...rest, content_summary: content }
}

const listStories = (query: URLSearchParams) => {
    const withSlug = query.get('with_slug')
    const search = query.get('text_search')?.toLowerCase()
    const published = query.get('is_published')
    let stories = state.stories.filter((story) => {
        if (withSlug !== null) return story.full_slug === withSlug
        if (!story.full_slug.startsWith(query.get('starts_with') ?? '')) return false
        if (query.get('story_only') && story.is_folder) return false
        if (
            search &&
            !JSON.stringify([story.name, story.content.title]).toLowerCase().includes(search)
        ) {
            return false
        }
        return published === null || story.published === (published === 'true')
    })
    if (query.get('folder_only')) stories = stories.filter((story) => story.is_folder)
    if (query.get('sort_by') === 'content.date:desc') {
        stories = stories.toSorted((a, b) =>
            String(b.content.date).localeCompare(String(a.content.date))
        )
    }
    return stories
}

const touch = (story: Story, publish: boolean) => {
    story.updated_at = new Date().toISOString()
    if (publish) {
        story.published = true
        story.unpublished_changes = false
        story.first_published_at ??= story.updated_at
    } else if (story.published) {
        story.unpublished_changes = true
    }
}

const slugTaken = (slug: string, parentId: number | null, exceptId?: number) =>
    state.stories.some(
        (story) => story.slug === slug && story.parent_id === parentId && story.id !== exceptId
    )

const parentSlug = (parentId: number | null) =>
    state.stories.find((story) => story.id === parentId)?.full_slug

const fullSlug = (slug: string, parentId: number | null) => {
    const parent = parentSlug(parentId)
    return parent ? `${parent}/${slug}` : slug
}

const handleStories = async (
    request: IncomingMessage,
    response: ServerResponse,
    parts: string[],
    query: URLSearchParams
) => {
    const [id, action] = parts
    if (!id) {
        if (request.method === 'GET') {
            const stories = listStories(query)
            const page = paginate(stories, query)
            return send(
                response,
                200,
                { stories: query.get('with_summary') ? page.map(summary) : page },
                { total: String(stories.length) }
            )
        }
        const { story: input } = (await readJson(request)) as { story: Partial<Story> }
        const parentId = input.parent_id ?? null
        if (slugTaken(String(input.slug), parentId)) {
            return send(response, 422, { slug: ['has already been taken'] })
        }
        const now = new Date().toISOString()
        const story: Story = {
            id: state.nextId++,
            name: String(input.name),
            slug: String(input.slug),
            full_slug: fullSlug(String(input.slug), parentId),
            parent_id: parentId,
            is_folder: false,
            published: false,
            unpublished_changes: false,
            created_at: now,
            updated_at: now,
            first_published_at: null,
            tag_list: [],
            stage: null,
            content: { _uid: `uid-${Date.now()}`, ...(input.content as Content) },
        }
        state.stories.push(story)
        return send(response, 201, { story })
    }

    const story = state.stories.find((candidate) => candidate.id === Number(id))
    if (!story) return notFound(response)

    if (action === 'ai_translate') {
        const { code, lang } = (await readJson(request)) as { code: string; lang: string }
        const translated = Object.fromEntries(
            ['title', 'intro', 'long_text'].map((key) => [
                `${key}__i18n__${code}`,
                `[${lang}] ${String(story.content[key])}`,
            ])
        )
        return send(response, 200, {
            story: { ...story, content: { ...story.content, ...translated } },
        })
    }
    if (action === 'restore_with') {
        const version = state.versions.find(
            ({ id: versionId }) => versionId === Number(query.get('version'))
        )
        if (!version || query.get('versions_v2') !== 'true') return notFound(response)
        story.content = structuredClone(version.content)
        touch(story, false)
        return send(response, 200, { story })
    }
    if (action === 'unpublish') {
        story.published = false
        story.unpublished_changes = false
        return send(response, 200, { story })
    }
    if (action === 'duplicate') {
        const { story: input } = (await readJson(request)) as { story: Partial<Story> }
        if (slugTaken(String(input.slug), story.parent_id)) {
            return send(response, 422, { slug: ['has already been taken'] })
        }
        const copy: Story = {
            ...structuredClone(story),
            id: state.nextId++,
            name: String(input.name),
            slug: String(input.slug),
            full_slug: fullSlug(String(input.slug), story.parent_id),
            published: false,
            unpublished_changes: false,
            first_published_at: null,
        }
        state.stories.push(copy)
        return send(response, 200, { story: copy })
    }
    if (request.method === 'GET') return send(response, 200, { story })
    if (request.method === 'DELETE') {
        state.stories = state.stories.filter((candidate) => candidate !== story)
        return send(response, 200, { story })
    }
    const { story: input, publish } = (await readJson(request)) as {
        story: Partial<Story>
        publish?: boolean
    }
    if (input.slug && slugTaken(input.slug, story.parent_id, story.id)) {
        return send(response, 422, { slug: ['has already been taken'] })
    }
    Object.assign(story, input)
    story.full_slug = fullSlug(story.slug, story.parent_id)
    touch(story, publish === true)
    state.versions.push({
        id: state.nextId++,
        story_id: story.id,
        created_at: story.updated_at,
        status: publish === true ? 'published' : 'draft',
        name: story.name,
        content: structuredClone(story.content),
    })
    return send(response, 200, { story })
}

const MIME: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    pdf: 'application/pdf',
}

const handleAssets = async (
    request: IncomingMessage,
    response: ServerResponse,
    parts: string[],
    query: URLSearchParams
) => {
    const [id, action] = parts
    if (!id) {
        if (request.method === 'GET') {
            const search = query.get('search')?.toLowerCase()
            const folder = query.get('in_folder')
            const trash = folder === '-1'
            const assets = state.assets
                .filter((item) => item.finished && (item.deleted_at !== null) === trash)
                .filter((item) => !search || item.short_filename.toLowerCase().includes(search))
                .filter(
                    (item) => trash || folder === null || item.asset_folder_id === Number(folder)
                )
                .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
            return send(
                response,
                200,
                { assets: paginate(assets, query) },
                {
                    total: String(assets.length),
                }
            )
        }
        const body = (await readJson(request)) as {
            filename: string
            size?: string
            asset_folder_id?: number
        }
        const extension = body.filename.split('.').pop()?.toLowerCase() ?? ''
        const key = `f/1/${body.size ?? 'file'}/${state.nextId}/${body.filename}`
        const target: Asset = {
            ...asset(state.nextId++, body.filename, body.asset_folder_id ?? null, 1),
            filename: `https://s3.amazonaws.com/a.storyblok.com/${key}`,
            content_type: MIME[extension] ?? 'application/octet-stream',
            created_at: new Date().toISOString(),
            finished: false,
        }
        state.assets.push(target)
        return send(response, 200, {
            id: target.id,
            post_url: 'https://s3.amazonaws.com/a.storyblok.com',
            pretty_url: `//a.storyblok.com/${key}`,
            fields: {
                key,
                acl: 'public-read',
                policy: 'e2e-policy',
                'Content-Type': target.content_type,
            },
        })
    }
    if (id === 'bulk_destroy') {
        const { ids } = (await readJson(request)) as { ids: number[] }
        state.assets
            .filter((item) => ids.includes(item.id))
            .forEach((item) => (item.deleted_at = new Date().toISOString()))
        return send(response, 204)
    }
    if (id === 'bulk_restore') {
        const { ids } = (await readJson(request)) as { ids: number[] }
        state.assets
            .filter((item) => ids.includes(item.id))
            .forEach((item) => (item.deleted_at = null))
        return send(response, 204)
    }
    if (id === 'bulk_update') {
        const { ids, asset: input } = (await readJson(request)) as {
            ids: number[]
            asset: { asset_folder_id: number }
        }
        state.assets
            .filter((item) => ids.includes(item.id))
            .forEach((item) => (item.asset_folder_id = input.asset_folder_id))
        return send(response, 204)
    }
    const target = state.assets.find((item) => item.id === Number(id))
    if (!target) return notFound(response)
    if (action === 'finish_upload') {
        target.finished = true
        return send(response, 200, { id: target.id, filename: target.filename })
    }
    if (request.method === 'PUT') {
        const { asset: input } = (await readJson(request)) as { asset: Partial<Asset> }
        Object.assign(target, input, { updated_at: new Date().toISOString() })
        return send(response, 204)
    }
    return send(response, 200, target)
}

const handleFolders = async (request: IncomingMessage, response: ServerResponse, id?: string) => {
    if (!id) {
        if (request.method === 'GET') return send(response, 200, { asset_folders: state.folders })
        const { asset_folder: input } = (await readJson(request)) as { asset_folder: Folder }
        const folder = { id: state.nextId++, name: input.name, parent_id: input.parent_id ?? null }
        state.folders.push(folder)
        return send(response, 201, { asset_folder: folder })
    }
    const folder = state.folders.find((candidate) => candidate.id === Number(id))
    if (!folder) return notFound(response)
    if (request.method === 'DELETE') {
        state.folders = state.folders.filter((candidate) => candidate !== folder)
        state.assets
            .filter((item) => item.asset_folder_id === folder.id)
            .forEach((item) => (item.asset_folder_id = null))
        return send(response, 204)
    }
    const { asset_folder: input } = (await readJson(request)) as { asset_folder: Folder }
    Object.assign(folder, input)
    return send(response, 204)
}

const route = async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)
    if (url.pathname === '/__reset') {
        state = seed()
        return send(response, 204)
    }
    if (url.pathname === '/__state') return send(response, 200, state)
    if (!url.pathname.startsWith(SPACE)) return notFound(response)
    if (request.headers.authorization !== TOKEN)
        return send(response, 401, { error: 'Unauthorized' })
    const [resource, ...parts] = url.pathname.slice(SPACE.length).split('/').filter(Boolean)
    switch (resource) {
        case undefined:
            return send(response, 200, {
                space: {
                    default_lang_name: 'English',
                    languages: [{ code: 'es', name: 'Spanish', ai_translation_code: 'es' }],
                },
            })
        case 'stories':
            return handleStories(request, response, parts, url.searchParams)
        case 'assets':
            return handleAssets(request, response, parts, url.searchParams)
        case 'asset_folders':
            return handleFolders(request, response, parts[0])
        case 'components':
            return send(response, 200, { components })
        case 'story_versions':
            return send(response, 200, {
                story_versions: state.versions
                    .filter(
                        ({ story_id }) => story_id === Number(url.searchParams.get('by_story_id'))
                    )
                    .map(({ id, story_id, created_at, status }) => ({
                        id,
                        story_id,
                        created_at,
                        status,
                        user: { friendly_name: 'Editor' },
                    })),
            })
        case 'workflows':
            return send(response, 200, {
                workflows: [{ id: 303, name: 'Default', is_default: true, content_types: [] }],
            })
        case 'workflow_stages':
            return send(response, 200, {
                workflow_stages: [
                    { id: 2, name: 'Reviewing', position: 2, workflow_id: 303 },
                    { id: 1, name: 'Drafting', position: 1, workflow_id: 303 },
                    { id: 9, name: 'Elsewhere', position: 1, workflow_id: 999 },
                ],
            })
        case 'workflow_stage_changes': {
            const { workflow_stage_change: change } = (await readJson(request)) as {
                workflow_stage_change: { story_id: number; workflow_stage_id: number }
            }
            const target = state.stories.find(({ id }) => id === change.story_id)
            if (!target) return notFound(response)
            target.stage = { workflow_stage_id: change.workflow_stage_id }
            return send(response, 201, { workflow_stage_change: { id: state.nextId++, ...change } })
        }
        case 'tags':
            return send(response, 200, { tags: [{ name: 'news', taggings_count: 1 }] })
        default:
            return notFound(response)
    }
}

createServer((request, response) => {
    route(request, response).catch((error: unknown) => {
        console.error(error)
        send(response, 500, { error: 'Mock failure' })
    })
}).listen(PORT)
