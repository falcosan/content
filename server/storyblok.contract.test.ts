import type {
    Asset,
    AssetFolder,
    AssetFolderCreate,
    AssetFolderUpdate,
    AssetUpdateRequest,
    Component,
    SignedResponseObject,
    SpaceUpdate,
    Story,
    StoryUpdate,
} from '@storyblok/management-api-client'
import { describe, expectTypeOf, it } from 'vitest'
import type {
    StoryblokAsset,
    StoryblokAssetFolder,
    StoryblokAssetInput,
    StoryblokComponent,
    StoryblokLanguage,
    StoryblokSignedUpload,
    StoryblokStory,
    StoryblokStoryInput,
} from './storyblok'

type Compatibility<Official, Ours> = {
    [Key in keyof Ours]-?: Key extends keyof Official
        ? [Official[Key]] extends [Ours[Key]]
            ? 'ok'
            : { official: Official[Key]; ours: Ours[Key] }
        : 'not in the official type'
}

type AllOk<Ours> = { [Key in keyof Ours]-?: 'ok' }

describe('Storyblok Management API contract', () => {
    it('only reads response fields the official API types guarantee', () => {
        expectTypeOf<Compatibility<Story, Omit<StoryblokStory, 'content_summary'>>>().toEqualTypeOf<
            AllOk<Omit<StoryblokStory, 'content_summary'>>
        >()
        expectTypeOf<Compatibility<Asset, StoryblokAsset>>().toEqualTypeOf<AllOk<StoryblokAsset>>()
        expectTypeOf<Compatibility<AssetFolder, StoryblokAssetFolder>>().toEqualTypeOf<
            AllOk<StoryblokAssetFolder>
        >()
        expectTypeOf<Compatibility<SignedResponseObject, StoryblokSignedUpload>>().toEqualTypeOf<
            AllOk<StoryblokSignedUpload>
        >()
        expectTypeOf<Compatibility<Component, StoryblokComponent>>().toEqualTypeOf<
            AllOk<StoryblokComponent>
        >()
        expectTypeOf<
            Compatibility<NonNullable<SpaceUpdate['languages']>[number], StoryblokLanguage>
        >().toEqualTypeOf<AllOk<StoryblokLanguage>>()
    })

    it('only sends request bodies the official API types accept', () => {
        expectTypeOf<StoryblokStoryInput>().toExtend<StoryUpdate>()
        expectTypeOf<{ asset: StoryblokAssetInput }>().toExtend<AssetUpdateRequest>()
        expectTypeOf<{ name: string; parent_id: number | null }>().toExtend<AssetFolderCreate>()
        expectTypeOf<{ name: string; parent_id: number | null }>().toExtend<AssetFolderUpdate>()
    })
})
