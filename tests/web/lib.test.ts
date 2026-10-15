import { describe, expect, it } from 'vitest'
import type { Asset, Field, Story } from '#types/api'
import type { AssetFilters } from '#types/app'
import {
    acceptFor,
    assetKind,
    emptyAssetValue,
    isAssetValue,
    isImageUrl,
    matchesFiletypes,
    thumbnailUrl,
    toAssetValue,
    toExternalAssetValue,
} from '@/lib/assets'
import { fromEditorHtml, isBlankHtml, plainText, toEditorHtml, toMarkdown } from '@/lib/content'
import { cloneDraft, draftTitle, snapshot, toDraft } from '@/lib/draft'
import { parseHttpsUrl, parseHttpUrl, toEmbedUrl } from '@/lib/embed'
import { keepWhileSearching } from '@/lib/filters'
import { roveFocus } from '@/lib/focus'
import { flattenFolders, folderLabel } from '@/lib/folders'
import { formatBytes, formatDate, formatRelative } from '@/lib/format'
import { safeRedirect } from '@/lib/navigation'
import { validateContent } from '@/lib/validation'

describe('embed', () => {
    const hosts = ['aprograma.com', 'editor.test', 'aprograma.com']

    it.each([
        [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=42',
        ],
        [
            'https://youtu.be/dQw4w9WgXcQ?t=1m30s',
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90',
        ],
        [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s',
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=3723',
        ],
        [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=soon',
            'https://www.youtube.com/embed/dQw4w9WgXcQ',
        ],
        ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        [
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=7',
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=7',
        ],
        ['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456'],
        [
            'https://www.dailymotion.com/video/x8abc12',
            'https://www.dailymotion.com/embed/video/x8abc12',
        ],
        [
            'https://www.twitch.tv/somebody',
            'https://player.twitch.tv/?channel=somebody&parent=aprograma.com&parent=editor.test',
        ],
        [
            'https://www.twitch.tv/somebody/clip/Funny-Clip_123',
            'https://clips.twitch.tv/embed?clip=Funny-Clip_123&parent=aprograma.com&parent=editor.test',
        ],
        ['https://player.vimeo.com/video/123456', 'https://player.vimeo.com/video/123456'],
        ['https://codepen.io/pen/abc', 'https://codepen.io/pen/abc'],
        ['http://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
        ['http://codepen.io/pen/abc', null],
    ])('converts %s', (input, expected) => {
        expect(toEmbedUrl(input, hosts)).toBe(expected)
    })

    it.each(['javascript:alert(1)', 'not a url', 'ftp://example.com/file', ''])(
        'rejects %j',
        (input) => {
            expect(toEmbedUrl(input, hosts)).toBeNull()
            expect(parseHttpUrl(input)).toBeNull()
            expect(parseHttpsUrl(input)).toBeNull()
        }
    )

    it('accepts only https for media', () => {
        expect(parseHttpUrl('http://example.com/a.png')?.href).toBe('http://example.com/a.png')
        expect(parseHttpsUrl('http://example.com/a.png')).toBeNull()
        expect(parseHttpsUrl(' https://example.com/a.png ')?.href).toBe('https://example.com/a.png')
    })
})

describe('content', () => {
    it('keeps HTML and converts legacy markdown', () => {
        expect(toEditorHtml('<p>Hi</p>')).toBe('<p>Hi</p>')
        expect(toEditorHtml('')).toBe('')
        expect(toEditorHtml('# Title\n\nSome **bold** text')).toBe(
            '<h1>Title</h1>\n<p>Some <strong>bold</strong> text</p>\n'
        )
    })

    it('normalizes the empty document', () => {
        expect(fromEditorHtml('<p></p>')).toBe('')
        expect(fromEditorHtml('<p>x</p>')).toBe('<p>x</p>')
    })

    it('detects blank HTML but keeps media', () => {
        expect(isBlankHtml('<p>  </p><p>&nbsp;</p>')).toBe(true)
        expect(isBlankHtml('<figure><img src="a.png" alt=""></figure>')).toBe(false)
        expect(isBlankHtml('<div><iframe src="x"></iframe></div>')).toBe(false)
        expect(plainText('<p>a&amp;b</p>')).toBe('a&b')
    })

    it('exports markdown with highlights and fenced code', () => {
        expect(
            toMarkdown('<h2>Hi</h2><p><mark>key</mark> point</p><pre><code>x = 1</code></pre>')
        ).toBe('## Hi\n\n<mark>key</mark> point\n\n```\nx = 1\n```')
    })
})

describe('format', () => {
    const unit = (value: number, name: string, digits = 0) =>
        new Intl.NumberFormat(undefined, {
            style: 'unit',
            unit: name,
            unitDisplay: 'short',
            maximumFractionDigits: digits,
        }).format(value)

    it('formats bytes with the closest binary unit', () => {
        expect(formatBytes(0)).toBe(unit(0, 'byte'))
        expect(formatBytes(512)).toBe(unit(512, 'byte'))
        expect(formatBytes(2048)).toBe(unit(2, 'kilobyte', 1))
        expect(formatBytes(1.5 * 1024 * 1024)).toBe(unit(1.5, 'megabyte', 1))
        expect(formatBytes(5 * 1024 ** 4)).toBe(unit(5120, 'gigabyte', 1))
    })

    it('formats date-only values in UTC to avoid timezone drift', () => {
        const utc = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
        expect(formatDate('2025-01-01')).toBe(utc.format(Date.UTC(2025, 0, 1)))
        expect(formatDate('garbage')).toBe('garbage')
    })

    it('picks the largest fitting relative unit', () => {
        const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
        const now = Date.parse('2025-06-10T12:00:00Z')
        expect(formatRelative('2025-06-10T11:59:30Z', now)).toBe(relative.format(0, 'minute'))
        expect(formatRelative('2025-06-10T09:00:00Z', now)).toBe(relative.format(-3, 'hour'))
        expect(formatRelative('2025-06-09T12:00:00Z', now)).toBe(relative.format(-1, 'day'))
        expect(formatRelative('2024-06-10T12:00:00Z', now)).toBe(relative.format(-1, 'year'))
    })
})

describe('assets', () => {
    const asset: Asset = {
        id: 1,
        url: 'https://a.storyblok.com/f/1/800x600/abc/photo.png',
        name: 'photo.png',
        contentType: 'image/png',
        size: 10,
        width: 800,
        height: 600,
        alt: 'Alt',
        title: 'Title',
        copyright: 'Me',
        source: 'Camera',
        folderId: null,
        createdAt: '2025-01-01T00:00:00Z',
        deletedAt: null,
    }

    it('optimizes only raster images', () => {
        expect(thumbnailUrl(asset.url, 320)).toBe(`${asset.url}/m/320x0`)
        expect(thumbnailUrl('https://a.storyblok.com/f/1/logo.svg', 320)).toBe(
            'https://a.storyblok.com/f/1/logo.svg'
        )
        expect(thumbnailUrl('https://a.storyblok.com/f/1/anim.gif', 320)).toBe(
            'https://a.storyblok.com/f/1/anim.gif'
        )
        expect(thumbnailUrl('https://a-us.storyblok.com/f/1/a.jpg', 100)).toBe(
            'https://a-us.storyblok.com/f/1/a.jpg/m/100x0'
        )
        expect(thumbnailUrl('https://images.example.org/cover.png', 320)).toBe(
            'https://images.example.org/cover.png'
        )
        expect(isImageUrl('https://a.storyblok.com/f/1/logo.SVG')).toBe(true)
        expect(isImageUrl('https://a.storyblok.com/f/1/doc.pdf')).toBe(false)
    })

    it.each([
        ['image/webp', 'image'],
        ['video/mp4', 'video'],
        ['audio/mpeg', 'audio'],
        ['text/plain', 'document'],
        ['application/pdf', 'document'],
        ['application/zip', 'file'],
        ['', 'file'],
    ])('classifies %j as %s', (contentType, kind) => {
        expect(assetKind(contentType)).toBe(kind)
    })

    it('maps Storyblok filetypes', () => {
        expect(acceptFor(['images', 'texts'])).toBe('image/*,text/*,application/*')
        expect(acceptFor([])).toBe('')
        expect(matchesFiletypes('image/png', ['images'])).toBe(true)
        expect(matchesFiletypes('video/mp4', ['images'])).toBe(false)
        expect(matchesFiletypes('application/pdf', ['texts'])).toBe(true)
        expect(matchesFiletypes('video/mp4', [])).toBe(true)
    })

    it('builds Storyblok asset field values', () => {
        expect(toAssetValue(asset)).toEqual({
            id: 1,
            alt: 'Alt',
            name: '',
            focus: '',
            title: 'Title',
            source: 'Camera',
            filename: asset.url,
            copyright: 'Me',
            fieldtype: 'asset',
            meta_data: {},
            is_external_url: false,
        })
        expect(toExternalAssetValue('https://images.example.org/c.jpg', 'Alt')).toEqual({
            ...emptyAssetValue(),
            alt: 'Alt',
            filename: 'https://images.example.org/c.jpg',
            is_external_url: true,
        })
        expect(isAssetValue(emptyAssetValue())).toBe(true)
        expect(isAssetValue('x')).toBe(false)
        expect(isAssetValue(null)).toBe(false)
    })
})

describe('folders', () => {
    it('flattens nested folders depth first and promotes orphans', () => {
        const flat = flattenFolders([
            { id: 1, name: 'Root', parentId: null },
            { id: 2, name: 'Child', parentId: 1 },
            { id: 3, name: 'Grandchild', parentId: 2 },
            { id: 4, name: 'Orphan', parentId: 99 },
            { id: 5, name: 'Second', parentId: null },
        ])
        expect(flat.map(({ id, depth }) => [id, depth])).toEqual([
            [1, 0],
            [2, 1],
            [3, 2],
            [4, 0],
            [5, 0],
        ])
    })
})

describe('folderLabel', () => {
    it('indents nested folder names', () => {
        expect(folderLabel({ id: 1, name: 'Root', parentId: null, depth: 0 })).toBe('Root')
        expect(folderLabel({ id: 2, name: 'Deep', parentId: 1, depth: 2 })).toBe('— — Deep')
    })
})

describe('draft', () => {
    const story: Story = {
        id: 1,
        status: 'draft',
        url: 'https://example.test/blog/post',
        updatedAt: '2025-01-01T00:00:00.000Z',
        firstPublishedAt: null,
        content: { component: 'Post', title: 'Title', categories: ['vue'] },
    }

    it('keeps only the editable content of a story', () => {
        expect(toDraft(story)).toEqual(story.content)
    })

    it('detaches the draft from the story content', () => {
        const categories = toDraft(story).categories as string[]
        categories.push('rust')
        expect(story.content.categories).toEqual(['vue'])
    })

    it('clones drafts with an identical snapshot', () => {
        const draft = toDraft(story)
        const clone = cloneDraft(draft)
        expect(clone).not.toBe(draft)
        expect(clone.categories).not.toBe(draft.categories)
        expect(snapshot(clone)).toBe(snapshot(draft))
    })

    it('titles a draft by its title field', () => {
        const draft = toDraft(story)
        expect(draftTitle(draft)).toBe('Title')
        expect(draftTitle({ ...draft, title: '   ' })).toBe('Post')
        expect(draftTitle(null)).toBe('Post')
    })
})

describe('roveFocus', () => {
    const setup = () => {
        document.body.innerHTML =
            '<button>a</button><button>b</button><button>c</button><select></select>'
        return [...document.querySelectorAll('button')]
    }

    const press = (key: string, items: HTMLElement[]) => {
        const event = new KeyboardEvent('keydown', { key, cancelable: true })
        roveFocus(event, items, ['ArrowLeft', 'ArrowRight'])
        return event
    }

    it('moves, wraps around and jumps to both ends', () => {
        const items = setup()
        items[0]?.focus()
        expect(press('ArrowRight', items).defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(items[1])
        press('ArrowLeft', items)
        press('ArrowLeft', items)
        expect(document.activeElement).toBe(items[2])
        press('ArrowRight', items)
        expect(document.activeElement).toBe(items[0])
        press('End', items)
        expect(document.activeElement).toBe(items[2])
        press('Home', items)
        expect(document.activeElement).toBe(items[0])
    })

    it('ignores other keys and focus outside the items', () => {
        const items = setup()
        items[1]?.focus()
        expect(press('Enter', items).defaultPrevented).toBe(false)
        expect(document.activeElement).toBe(items[1])
        document.querySelector('select')?.focus()
        expect(press('ArrowRight', items).defaultPrevented).toBe(false)
        expect(document.activeElement?.tagName).toBe('SELECT')
    })
})

describe('keepWhileSearching', () => {
    const filters: AssetFilters = { search: 'cat', location: 3 }
    const keep = keepWhileSearching(filters)
    const previous = ['previous page']

    it('keeps the previous results only while the search text changes', () => {
        expect(keep(previous, { queryKey: ['assets', { ...filters, search: 'dog' }] })).toBe(
            previous
        )
        expect(
            keep(previous, { queryKey: ['assets', { ...filters, location: 4 }] })
        ).toBeUndefined()
        expect(
            keep(previous, { queryKey: ['assets', { ...filters, location: 'trash' }] })
        ).toBeUndefined()
        expect(keep(previous, undefined)).toBeUndefined()
    })
})

describe('navigation', () => {
    it.each([
        ['/stories/1?x=1', '/stories/1?x=1'],
        ['//evil.test', '/'],
        ['https://evil.test', '/'],
        [undefined, '/'],
        [['/a'], '/'],
    ])('sanitizes redirect %j', (input, expected) => {
        expect(safeRedirect(input)).toBe(expected)
    })
})

describe('validateContent', () => {
    const base = { label: 'Field', description: '' }
    const fields: Field[] = [
        { ...base, key: 'title', type: 'text', required: true, maxLength: 5 },
        { ...base, key: 'body', type: 'markdown', required: true, maxLength: 4 },
        {
            ...base,
            key: 'categories',
            type: 'options',
            required: true,
            options: [],
            maxOptions: 1,
            allowNewOptions: false,
        },
        {
            ...base,
            key: 'cover',
            type: 'asset',
            required: true,
            filetypes: [],
            allowExternalUrl: false,
        },
        { ...base, key: 'flag', type: 'boolean', required: true },
        { ...base, key: 'date', type: 'datetime', required: false, withTime: false },
    ]

    it('reports missing required values', () => {
        expect(
            validateContent(fields, {
                component: 'Post',
                title: ' ',
                body: '<p></p>',
                categories: [],
                cover: emptyAssetValue(),
            })
        ).toEqual({
            title: 'This field is required',
            body: 'This field is required',
            categories: 'This field is required',
            cover: 'This field is required',
        })
    })

    it('enforces limits using visible text length', () => {
        expect(
            validateContent(fields, {
                component: 'Post',
                title: 'Too long',
                body: '<p><strong>abcd</strong></p>',
                categories: ['a', 'b'],
                cover: { ...emptyAssetValue(), filename: 'https://a.storyblok.com/f/1/a.png' },
            })
        ).toEqual({
            title: 'Use at most 5 characters',
            categories: 'Choose at most 1 option',
        })
    })
})
