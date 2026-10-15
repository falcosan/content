import { Hono } from 'hono'
import { z } from 'zod'
import type { Storyblok } from '#types/storyblok'
import { MAX_LENGTH } from '../../shared/validation'
import { toAssetFolder } from '../dto'
import { idParam, validate } from '../validate'

const folderBody = z.object({
    name: z.string().trim().min(1).max(MAX_LENGTH.folderName),
    parentId: z.number().int().positive().nullable().default(null),
})

const toInput = ({ name, parentId }: z.infer<typeof folderBody>) => ({ name, parent_id: parentId })

export const folderRoutes = (storyblok: Storyblok) =>
    new Hono()
        .get('/', async (c) => {
            const folders = await storyblok.listAssetFolders()
            return c.json(folders.map(toAssetFolder).sort((a, b) => a.name.localeCompare(b.name)))
        })
        .post('/', validate('json', folderBody), async (c) => {
            const folder = await storyblok.createAssetFolder(toInput(c.req.valid('json')))
            return c.json(toAssetFolder(folder), 201)
        })
        .put('/:id', validate('param', idParam), validate('json', folderBody), async (c) => {
            await storyblok.updateAssetFolder(c.req.valid('param').id, toInput(c.req.valid('json')))
            return c.body(null, 204)
        })
        .delete('/:id', validate('param', idParam), async (c) => {
            await storyblok.deleteAssetFolder(c.req.valid('param').id)
            return c.body(null, 204)
        })
