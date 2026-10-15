import type { Story } from '#types/api'
import type { StoryContent } from '#types/storyblok'
import { BLOG } from '../../shared/blog'

export const snapshot = (draft: StoryContent) => JSON.stringify(draft)

export const cloneDraft = (draft: StoryContent) => JSON.parse(snapshot(draft)) as StoryContent

export const toDraft = ({ content }: Story) => cloneDraft(content)

export const draftTitle = (draft: StoryContent | null) => {
    const value = draft?.[BLOG.fields.title]
    return typeof value === 'string' && value.trim() ? value : 'Post'
}
