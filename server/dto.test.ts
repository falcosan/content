import { describe, expect, it } from 'vitest'
import { publicAssetUrl, toAsset, toFields, toStory } from './dto'
import { storyFixture } from './test/fakes'

describe('dto', () => {
    it('rewrites storage URLs to the public CDN', () => {
        expect(publicAssetUrl('https://s3.amazonaws.com/a.storyblok.com/f/1/a.png')).toBe(
            'https://a.storyblok.com/f/1/a.png'
        )
        expect(publicAssetUrl('https://a.storyblok.com/f/1/a.png')).toBe(
            'https://a.storyblok.com/f/1/a.png'
        )
    })

    it('maps assets that omit optional fields', () => {
        expect(
            toAsset({
                id: 1,
                filename: 'https://s3.amazonaws.com/a.storyblok.com/f/1/28262/abc/cat.webp',
                created_at: '2025-01-01T00:00:00.000Z',
                updated_at: '2025-01-01T00:00:00.000Z',
            })
        ).toEqual({
            id: 1,
            url: 'https://a.storyblok.com/f/1/28262/abc/cat.webp',
            name: 'cat.webp',
            contentType: '',
            size: null,
            width: null,
            height: null,
            alt: '',
            title: '',
            copyright: '',
            source: '',
            folderId: null,
            createdAt: '2025-01-01T00:00:00.000Z',
        })
    })

    it('always exposes a component name on story content', () => {
        expect(
            toStory(storyFixture({ content: { title: 'x' } }), 'https://example.com/').content
        ).toEqual({
            title: 'x',
            component: '',
        })
        expect(
            toStory(storyFixture({ content: undefined }), 'https://example.com/').content
        ).toEqual({
            component: '',
        })
    })

    it('skips schema entries without a definition or with unsupported types', () => {
        expect(
            toFields({
                name: 'Post',
                schema: {
                    gone: undefined,
                    blocks: { type: 'bloks' },
                    untyped: {},
                    title: { type: 'text' },
                },
            }).map(({ key }) => key)
        ).toEqual(['title'])
    })
})
