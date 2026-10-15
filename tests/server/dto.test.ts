import { describe, expect, it } from 'vitest'
import { publicAssetUrl, toAsset, toFields, toStory } from '../../server/dto'
import { storyFixture } from './fakes'

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
            deletedAt: null,
        })
    })

    it('always exposes a component name on story content', () => {
        expect(
            toStory(storyFixture({ content: { title: 'x' } }), 'https://example.com/', 'token')
                .content
        ).toEqual({
            title: 'x',
            component: '',
        })
        expect(
            toStory(storyFixture({ content: undefined }), 'https://example.com/', 'token').content
        ).toEqual({
            component: '',
        })
    })

    it('skips schema entries with unsupported types', () => {
        expect(
            toFields({
                id: 1,
                name: 'Post',
                schema: {
                    blocks: { type: 'bloks' },
                    untyped: {},
                    title: { type: 'text' },
                },
            }).map(({ key }) => key)
        ).toEqual(['title'])
    })

    it('allows external asset URLs only when the schema enables them', () => {
        const [cover, gallery] = toFields({
            id: 1,
            name: 'Post',
            schema: {
                cover: { type: 'asset', filetypes: ['images'] },
                gallery: { type: 'asset', allow_external_url: true },
            },
        })
        expect(cover).toMatchObject({ type: 'asset', allowExternalUrl: false })
        expect(gallery).toMatchObject({ type: 'asset', filetypes: [], allowExternalUrl: true })
    })
})
