import { useQueryClient } from '@tanstack/vue-query'
import { reactive, readonly } from 'vue'
import { errorMessage, type Asset } from '@/api/client'
import { keys } from '@/api/queries'
import { uploadAsset } from '@/lib/upload'

export type UploadStatus = 'uploading' | 'done' | 'failed'

export interface UploadItem {
    id: number
    name: string
    progress: number
    status: UploadStatus
    error: string
}

const CONCURRENCY = 2
const DONE_VISIBLE_MS = 2500

const items = reactive<UploadItem[]>([])

let lastId = 0

export const dismissUpload = (id: number) => {
    const index = items.findIndex((item) => item.id === id)
    if (index !== -1) items.splice(index, 1)
}

const track = (name: string) => {
    items.push({ id: ++lastId, name, progress: 0, status: 'uploading', error: '' })
    return items[items.length - 1]!
}

const runPool = async <T, R>(values: T[], limit: number, task: (value: T) => Promise<R>) => {
    const results: PromiseSettledResult<R>[] = []
    let cursor = 0
    const worker = async () => {
        while (cursor < values.length) {
            const index = cursor++
            results[index] = await task(values[index]!).then(
                (value) => ({ status: 'fulfilled', value }) as const,
                (reason: unknown) => ({ status: 'rejected', reason }) as const
            )
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
    return results
}

export const useUploads = () => {
    const queryClient = useQueryClient()

    const upload = async (
        files: File[],
        options: { folderId: number | null }
    ): Promise<Asset[]> => {
        const results = await runPool(files, CONCURRENCY, async (file) => {
            const item = track(file.name)
            try {
                const asset = await uploadAsset(file, {
                    ...options,
                    onProgress: (ratio) => (item.progress = ratio),
                })
                item.progress = 1
                item.status = 'done'
                setTimeout(() => dismissUpload(item.id), DONE_VISIBLE_MS)
                return asset
            } catch (error) {
                item.status = 'failed'
                item.error = errorMessage(error)
                throw error
            }
        })
        await queryClient.invalidateQueries({ queryKey: keys.assets })
        return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    }

    return { items: readonly(items), upload }
}
