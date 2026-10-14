import { describe, expect, it } from 'vitest'
import type { Asset, Field } from '@/api/client'
import {
    acceptFor,
    emptyAssetValue,
    isAssetValue,
    isImageUrl,
    matchesFiletypes,
    thumbnailUrl,
    toAssetValue,
} from './assets'
import { fromEditorHtml, isBlankHtml, plainText, toEditorHtml, toMarkdown } from './content'
import { parseHttpUrl, toEmbedUrl } from './embed'
import { flattenFolders, folderLabel } from './folders'
import { formatBytes, formatDate, formatRelative } from './format'
import { safeRedirect } from './navigation'
import { isSlug, slugify } from './slug'
import { validateContent } from './validation'

describe('slug', () => {
    it.each([
        ['Hello World', 'hello-world'],
        ['  Ça va?  Très bien!  ', 'ca-va-tres-bien'],
        ['Año 2025 — ¿Qué pasó?', 'ano-2025-que-paso'],
        ['---', ''],
    ])('slugifies %j', (input, expected) => {
        expect(slugify(input)).toBe(expected)
    })

    it('validates slugs', () => {
        expect(isSlug('hello-world-2')).toBe(true)
        expect(isSlug('Hello')).toBe(false)
        expect(isSlug('a--b')).toBe(false)
        expect(isSlug('-a')).toBe(false)
    })
})

describe('embed', () => {
    const hosts = ['aprograma.com', 'editor.test', 'aprograma.com']

    it.each([
        [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
            'https://www.youtube.com/embed/dQw4w9WgXcQ?start=42',
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
    ])('converts %s', (input, expected) => {
        expect(toEmbedUrl(input, hosts)).toBe(expected)
    })

    it.each(['javascript:alert(1)', 'not a url', 'ftp://example.com/file', ''])(
        'rejects %j',
        (input) => {
            expect(toEmbedUrl(input, hosts)).toBeNull()
            expect(parseHttpUrl(input)).toBeNull()
        }
    )
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
    }

    it('optimizes only raster images', () => {
        expect(thumbnailUrl(asset.url, 320)).toBe(`${asset.url}/m/320x0`)
        expect(thumbnailUrl('https://a.storyblok.com/f/1/logo.svg')).toBe(
            'https://a.storyblok.com/f/1/logo.svg'
        )
        expect(thumbnailUrl('https://a.storyblok.com/f/1/anim.gif')).toBe(
            'https://a.storyblok.com/f/1/anim.gif'
        )
        expect(isImageUrl('https://a.storyblok.com/f/1/logo.SVG')).toBe(true)
        expect(isImageUrl('https://a.storyblok.com/f/1/doc.pdf')).toBe(false)
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
    const base = { label: 'Field', translatable: false, description: '' }
    const fields: Field[] = [
        { ...base, key: 'title', type: 'text', required: true, maxLength: 5 },
        { ...base, key: 'body', type: 'markdown', required: true, maxLength: 4 },
        { ...base, key: 'tags', type: 'options', required: true, options: [], maxOptions: 1 },
        { ...base, key: 'cover', type: 'asset', required: true, filetypes: [] },
        { ...base, key: 'flag', type: 'boolean', required: true },
        { ...base, key: 'date', type: 'datetime', required: false, withTime: false },
    ]

    it('reports missing required values', () => {
        expect(
            validateContent(fields, {
                component: 'Post',
                title: ' ',
                body: '<p></p>',
                tags: [],
                cover: emptyAssetValue(),
            })
        ).toEqual({
            title: 'This field is required',
            body: 'This field is required',
            tags: 'This field is required',
            cover: 'This field is required',
        })
    })

    it('enforces limits using visible text length', () => {
        expect(
            validateContent(fields, {
                component: 'Post',
                title: 'Too long',
                body: '<p><strong>abcd</strong></p>',
                tags: ['a', 'b'],
                cover: { ...emptyAssetValue(), filename: 'https://a.storyblok.com/f/1/a.png' },
            })
        ).toEqual({
            title: 'Use at most 5 characters',
            tags: 'Choose at most 1 option',
        })
    })
})
