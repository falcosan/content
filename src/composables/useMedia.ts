import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { AssetMetadata, FolderInput } from '#types/app'
import { api, parseResponse } from '@/api/client'
import { keys } from '@/api/queries'
import { BULK_LIMIT } from '../../shared/validation'
import { notify } from './useToasts'

const inBatches = async (ids: number[], run: (batch: number[]) => Promise<unknown>) => {
    for (let index = 0; index < ids.length; index += BULK_LIMIT) {
        await run(ids.slice(index, index + BULK_LIMIT))
    }
}

const useInvalidate = () => {
    const queryClient = useQueryClient()
    return (...queryKeys: (readonly unknown[])[]) =>
        Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export const useUpdateAsset = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: ({ id, ...json }: AssetMetadata & { id: number }) =>
            parseResponse(api.assets[':id'].$put({ param: { id: String(id) }, json })),
        onSuccess: async () => {
            await invalidate(keys.assets)
            notify('Asset saved')
        },
    })
}

export const useMoveAssets = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: ({ ids, folderId }: { ids: number[]; folderId: number }) =>
            inBatches(ids, (batch) =>
                parseResponse(api.assets.move.$post({ json: { ids: batch, folderId } }))
            ),
        onSettled: async (_result, error, { ids }) => {
            await invalidate(keys.assets)
            if (!error) notify(ids.length === 1 ? 'Asset moved' : `${ids.length} assets moved`)
        },
    })
}

export const useDeleteAssets = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: (ids: number[]) =>
            inBatches(ids, (batch) =>
                parseResponse(api.assets.delete.$post({ json: { ids: batch } }))
            ),
        onSettled: async (_result, error, ids) => {
            await invalidate(keys.assets)
            if (!error) notify(ids.length === 1 ? 'Asset deleted' : `${ids.length} assets deleted`)
        },
    })
}

export const useRestoreAssets = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: (ids: number[]) =>
            inBatches(ids, (batch) =>
                parseResponse(api.assets.restore.$post({ json: { ids: batch } }))
            ),
        onSettled: async (_result, error, ids) => {
            await invalidate(keys.assets)
            if (!error)
                notify(ids.length === 1 ? 'Asset restored' : `${ids.length} assets restored`)
        },
    })
}

export const useSaveFolder = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: ({ id, ...json }: FolderInput & { id?: number }) =>
            id === undefined
                ? parseResponse(api.folders.$post({ json }))
                : parseResponse(api.folders[':id'].$put({ param: { id: String(id) }, json })),
        onSuccess: async (_result, { id }) => {
            await invalidate(keys.folders)
            notify(id === undefined ? 'Folder created' : 'Folder renamed')
        },
    })
}

export const useDeleteFolder = () => {
    const invalidate = useInvalidate()
    return useMutation({
        mutationFn: (id: number) =>
            parseResponse(api.folders[':id'].$delete({ param: { id: String(id) } })),
        onSuccess: async () => {
            await invalidate(keys.folders, keys.assets)
            notify('Folder deleted')
        },
    })
}
