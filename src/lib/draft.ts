import type { Story } from '#types/api'
import type { Draft } from '#types/app'
import { BLOG } from '../../shared/blog'

export const snapshot = (draft: Draft) => JSON.stringify(draft)

export const cloneDraft = (draft: Draft) => JSON.parse(snapshot(draft)) as Draft

export const toDraft = ({ name, slug, content }: Story) => cloneDraft({ name, slug, content })

export const draftTitle = (draft: Draft | null) => {
    const value = draft?.content[BLOG.fields.title]
    return typeof value === 'string' && value.trim() ? value : (draft?.name ?? 'Post')
}
