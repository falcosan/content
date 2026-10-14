import type { Page } from '@playwright/test'
import { expect, png, signIn, test } from './fixtures'

test.beforeEach(async ({ page }) => {
    await signIn(page, '/media')
    await expect(page.getByText('2 assets')).toBeVisible()
})

const card = (page: Page, name: string) => page.getByRole('button', { name: `Open ${name}` })

const live = (assets: { id: number; deleted_at: string | null }[]) =>
    assets.filter(({ deleted_at }) => deleted_at === null).map(({ id }) => id)

const folder = (page: Page, name: string) =>
    page.getByRole('navigation', { name: 'Folders' }).getByRole('button', { name, exact: true })

test('uploads files through signed storage requests', async ({ page, mock, storage }) => {
    await page.locator('input[type=file][multiple]').setInputFiles([png('one.png'), png('two.png')])
    await expect(card(page, 'one.png')).toBeVisible()
    await expect(card(page, 'two.png')).toBeVisible()
    await expect(page.getByText('4 assets')).toBeVisible()

    expect(storage.map(({ fileName }) => fileName).toSorted()).toEqual(['one.png', 'two.png'])
    for (const upload of storage) {
        expect(Object.keys(upload.fields)).toEqual(['key', 'acl', 'policy', 'Content-Type'])
        expect(upload.fields.key).toMatch(new RegExp(`^f/1/1x1/\\d+/${upload.fileName}$`))
    }
    const { assets } = await mock.state()
    expect(
        assets.filter(({ short_filename }) => /^(one|two)\.png$/.test(short_filename))
    ).toHaveLength(2)
    expect(assets.every(({ finished }) => finished)).toBe(true)
})

test('uploads into the selected folder by dropping files', async ({ page, mock }) => {
    await folder(page, 'Diagrams').click()
    await expect(page.getByText('1 asset', { exact: true })).toBeVisible()
    const transfer = await page.evaluateHandle((data) => {
        const dataTransfer = new DataTransfer()
        const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
        dataTransfer.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }))
        return dataTransfer
    }, png('dropped.png').buffer.toString('base64'))
    const zone = page.getByRole('region', { name: 'Assets' })
    await zone.dispatchEvent('dragenter', { dataTransfer: transfer })
    await expect(page.getByText('Drop to upload')).toBeVisible()
    await zone.dispatchEvent('drop', { dataTransfer: transfer })
    await expect(card(page, 'dropped.png')).toBeVisible()
    const dropped = (await mock.state()).assets.find(
        ({ short_filename }) => short_filename === 'dropped.png'
    )
    expect(dropped?.asset_folder_id).toBe(401)
})

test('searches assets by filename', async ({ page }) => {
    await page.getByPlaceholder('Search by filename').fill('diag')
    await expect(page.getByText('1 asset', { exact: true })).toBeVisible()
    await expect(card(page, 'diagram.png')).toBeVisible()
    await expect(card(page, 'cover.png')).toBeHidden()
    await page.getByPlaceholder('Search by filename').fill('missing')
    await expect(page.getByText('No assets match your search.')).toBeVisible()
})

test('edits metadata and moves an asset to a folder', async ({ page, mock }) => {
    await card(page, 'cover.png').click()
    const dialog = page.getByRole('dialog', { name: 'cover.png' })
    await expect(dialog.getByText('800 × 600')).toBeVisible()
    await dialog.getByLabel('Alt text').fill('A cover image')
    await dialog.getByLabel('Title').fill('Cover')
    await dialog.getByLabel('Copyright').fill('© Me')
    await dialog.getByLabel('Source').fill('Camera')
    await dialog.getByLabel('Folder').selectOption({ label: 'Diagrams' })
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Asset saved')).toBeVisible()
    const cover = (await mock.state()).assets.find(({ id }) => id === 301)
    expect(cover).toMatchObject({
        alt: 'A cover image',
        title: 'Cover',
        copyright: '© Me',
        source: 'Camera',
        asset_folder_id: 401,
    })
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
    await folder(page, 'Diagrams').click()
    await expect(page.getByText('2 assets')).toBeVisible()
})

test('deletes an asset from its details after confirmation', async ({ page, mock }) => {
    await card(page, 'cover.png').click()
    await page
        .getByRole('dialog', { name: 'cover.png' })
        .getByRole('button', { name: 'Delete' })
        .click()
    await page
        .getByRole('dialog', { name: 'Delete asset' })
        .getByRole('button', { name: 'Delete asset' })
        .click()
    await expect(page.getByText('Asset deleted')).toBeVisible()
    await expect(card(page, 'cover.png')).toBeHidden()
    expect(live((await mock.state()).assets)).toEqual([302])
})

test('moves and deletes assets in bulk', async ({ page, mock }) => {
    await page.getByRole('checkbox', { name: 'Select cover.png' }).check({ force: true })
    await page.getByRole('checkbox', { name: 'Select diagram.png' }).check({ force: true })
    await expect(page.getByText('2 selected')).toBeVisible()
    await page.getByLabel('Move to folder').selectOption({ label: 'Diagrams' })
    await page.getByRole('button', { name: 'Move', exact: true }).click()
    await expect(page.getByText('2 assets moved')).toBeVisible()
    await expect(page.getByText('2 selected')).toBeHidden()
    const moved = (await mock.state()).assets.filter(({ id }) => id === 301 || id === 302)
    expect(moved.map(({ asset_folder_id }) => asset_folder_id)).toEqual([401, 401])

    await page.getByRole('checkbox', { name: 'Select cover.png' }).check({ force: true })
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
        .getByRole('dialog', { name: 'Delete assets' })
        .getByRole('button', { name: 'Delete' })
        .click()
    await expect(page.getByText('Asset deleted')).toBeVisible()
    expect(live((await mock.state()).assets)).toEqual([302])
})

test('restores deleted assets from the trash', async ({ page, mock }) => {
    await folder(page, 'Trash').click()
    await expect(page.getByRole('button', { name: 'Upload' })).toBeHidden()
    await expect(card(page, 'old.png')).toBeVisible()
    await expect(card(page, 'cover.png')).toBeHidden()
    await card(page, 'old.png').click()
    await expect(page.getByText('1 selected')).toBeVisible()
    await page.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByText('Asset restored')).toBeVisible()
    await expect(page.getByText('The trash is empty.')).toBeVisible()
    expect(live((await mock.state()).assets)).toEqual([301, 302, 303])

    await folder(page, 'All assets').click()
    await expect(page.getByText('3 assets')).toBeVisible()
})

test('creates, renames and deletes folders', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'New folder' }).click()
    const create = page.getByRole('dialog', { name: 'New folder' })
    await create.getByLabel('Name').fill('Covers')
    await create.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Folder created')).toBeVisible()
    await folder(page, 'Covers').click()
    await expect(page.getByText('Drop files here or use Upload.')).toBeVisible()

    await page.getByRole('button', { name: 'Rename Covers' }).click()
    const rename = page.getByRole('dialog', { name: 'Rename folder' })
    await expect(rename.getByLabel('Name')).toHaveValue('Covers')
    await rename.getByLabel('Name').fill('Hero images')
    await rename.getByRole('button', { name: 'Rename' }).click()
    await expect(folder(page, 'Hero images')).toBeVisible()

    await page.getByRole('button', { name: 'New folder' }).click()
    await create.getByLabel('Name').fill('Nested')
    await create.getByRole('button', { name: 'Create' }).click()
    await expect(folder(page, 'Nested')).toBeVisible()
    const folders = (await mock.state()).folders
    const hero = folders.find(({ name }) => name === 'Hero images')
    expect(folders.find(({ name }) => name === 'Nested')?.parent_id).toBe(hero?.id)

    await page.getByRole('button', { name: 'Delete Hero images' }).click()
    await page
        .getByRole('dialog', { name: 'Delete folder' })
        .getByRole('button', { name: 'Delete folder' })
        .click()
    await expect(page.getByText('Folder deleted')).toBeVisible()
    await expect(folder(page, 'Hero images')).toBeHidden()
    await expect(folder(page, 'All assets')).toHaveAttribute('aria-current', 'true')
})
