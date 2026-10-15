import { describe, expect, it } from 'vitest'
import { readEnv } from '../../server/env'

const valid = {
    STORY_ID_SPACE: '42',
    STORY_OAUTH_TOKEN: 'management-token',
    STORY_AUTH_EMAIL: ' editor@example.com ',
    STORY_AUTH_PASSWORD: 'ab'.repeat(32),
    STORY_DOMAIN_PRO: 'https://example.com/',
}

describe('readEnv', () => {
    it('parses the environment and applies the Storyblok API defaults', () => {
        expect(readEnv(valid)).toEqual({
            STORY_ID_SPACE: 42,
            STORY_OAUTH_TOKEN: 'management-token',
            STORY_AUTH_EMAIL: 'editor@example.com',
            STORY_AUTH_PASSWORD: 'ab'.repeat(32),
            STORY_DOMAIN_PRO: 'https://example.com/',
            STORY_API_URL: 'https://mapi.storyblok.com/v1',
            STORY_CDN_URL: 'https://api.storyblok.com/v2/cdn',
        })
    })

    it.each([
        ['a password that is not a SHA-256 hex digest', { STORY_AUTH_PASSWORD: 'secret' }],
        ['a space id that is not a number', { STORY_ID_SPACE: 'space' }],
        ['a missing token', { STORY_OAUTH_TOKEN: undefined }],
        ['a site URL that is not a URL', { STORY_DOMAIN_PRO: 'aprograma' }],
    ])('rejects %s', (_case, overrides) => {
        expect(() => readEnv({ ...valid, ...overrides })).toThrow()
    })
})
