import { Hono } from 'hono'
import { z } from 'zod'
import type { Storyblok } from '#types/storyblok'
import { BULK_LIMIT, MAX_LENGTH } from '../../shared/validation'
import { toAsset } from '../dto'
import { idParam, pageQuery, searchQuery, validate } from '../validate'

const ASSETS_PER_PAGE = 48

const TRASH_FOLDER = -1

const id = z.number().int().positive()

const listQuery = z.object({
    page: pageQuery,
    search: searchQuery,
    folder: z.coerce.number().int().positive().optional(),
    trash: z.literal('1').optional(),
})

const uploadBody = z.object({
    filename: z.string().trim().min(1).max(255),
    width: id.optional(),
    height: id.optional(),
    folderId: id.nullish(),
})

const metadata = z.string().trim().max(MAX_LENGTH.assetText)

const assetBody = z.object({
    alt: metadata,
    title: metadata,
    copyright: metadata,
    source: metadata,
    folderId: id.nullable(),
})

const ids = z.array(id).min(1).max(BULK_LIMIT)

const moveBody = z.object({ ids, folderId: id })

const idsBody = z.object({ ids })

export const assetRoutes = (storyblok: Storyblok) =>
    new Hono()
        .get('/', validate('query', listQuery), async (c) => {
            const { page, search, folder, trash } = c.req.valid('query')
            const { data, total } = await storyblok.listAssets({
                page,
                per_page: ASSETS_PER_PAGE,
                search,
                in_folder: trash ? TRASH_FOLDER : folder,
                sort_by: 'created_at:desc',
            })
            return c.json({
                assets: data.assets.map(toAsset),
                total,
                page,
                perPage: ASSETS_PER_PAGE,
            })
        })
        .post('/uploads', validate('json', uploadBody), async (c) => {
            const { filename, width, height, folderId } = c.req.valid('json')
            const signed = await storyblok.signAsset({
                filename,
                size: width && height ? `${width}x${height}` : undefined,
                asset_folder_id: folderId ?? undefined,
            })
            return c.json({ id: signed.id, url: signed.post_url, fields: signed.fields }, 201)
        })
        .post('/:id/finish', validate('param', idParam), async (c) => {
            const { id } = c.req.valid('param')
            await storyblok.finishAssetUpload(id)
            return c.json(toAsset(await storyblok.getAsset(id)))
        })
        .put('/:id', validate('param', idParam), validate('json', assetBody), async (c) => {
            const { id } = c.req.valid('param')
            const { folderId, ...asset } = c.req.valid('json')
            await storyblok.updateAsset(id, { ...asset, asset_folder_id: folderId })
            return c.json(toAsset(await storyblok.getAsset(id)))
        })
        .post('/move', validate('json', moveBody), async (c) => {
            const { ids, folderId } = c.req.valid('json')
            await storyblok.moveAssets(ids, folderId)
            return c.body(null, 204)
        })
        .post('/delete', validate('json', idsBody), async (c) => {
            await storyblok.deleteAssets(c.req.valid('json').ids)
            return c.body(null, 204)
        })
        .post('/restore', validate('json', idsBody), async (c) => {
            await storyblok.restoreAssets(c.req.valid('json').ids)
            return c.body(null, 204)
        })
