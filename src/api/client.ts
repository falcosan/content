import { DetailedError, hc } from 'hono/client'
import type { AppType } from '../../server/app'

export { parseResponse } from 'hono/client'

export type {
    Asset,
    AssetFolder,
    Field,
    FieldOption,
    Story,
    StoryContent,
    StoryStatus,
    StorySummary,
    StoryVersion,
    WorkflowStage,
} from '../../server/dto'

export const api = hc<AppType>('/').api

export const statusOf = (error: unknown) =>
    error instanceof DetailedError ? Number(error.statusCode) : undefined

export const errorMessage = (error: unknown) => {
    if (error instanceof DetailedError) {
        const data: unknown = error.detail?.data
        if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            return data.error
        }
    }
    return error instanceof Error ? error.message : 'Something went wrong'
}
