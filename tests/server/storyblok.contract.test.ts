import type {
    Asset,
    AssetFolder,
    AssetFolderCreate,
    AssetFolderUpdate,
    AssetUpdateRequest,
    Component,
    ComponentUpdate,
    SignedResponseObject,
    SpaceDetail,
    Story,
    StoryUpdate,
} from '@storyblok/management-api-client'
import { describe, expectTypeOf, it } from 'vitest'
import type {
    StoryblokAsset,
    StoryblokAssetFolder,
    StoryblokAssetFolderInput,
    StoryblokAssetInput,
    StoryblokComponent,
    StoryblokComponentInput,
    StoryblokSignedUpload,
    StoryblokSpace,
    StoryblokStory,
    StoryblokStoryInput,
} from '#types/storyblok'
import type { AllOk, Compatibility } from '#types/tests'

describe('Storyblok Management API contract', () => {
    it('only reads response fields the official API types guarantee', () => {
        expectTypeOf<Compatibility<Story, StoryblokStory>>().toEqualTypeOf<AllOk<StoryblokStory>>()
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
        expectTypeOf<Compatibility<SpaceDetail, StoryblokSpace>>().toEqualTypeOf<
            AllOk<StoryblokSpace>
        >()
    })

    it('only sends request bodies the official API types accept', () => {
        expectTypeOf<StoryblokStoryInput>().toExtend<StoryUpdate>()
        expectTypeOf<{ asset: StoryblokAssetInput }>().toExtend<AssetUpdateRequest>()
        expectTypeOf<StoryblokAssetFolderInput>().toExtend<AssetFolderCreate>()
        expectTypeOf<StoryblokAssetFolderInput>().toExtend<AssetFolderUpdate>()
        expectTypeOf<StoryblokComponentInput>().toExtend<ComponentUpdate>()
    })
})
