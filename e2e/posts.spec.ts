import type { Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'
import { expect, png, signIn, test } from './fixtures'

const editor = (page: Page) => page.getByRole('textbox').and(page.locator('[contenteditable]'))

const placeCaretAtEnd = async (page: Page) => {
    const paragraph = editor(page).locator('p').last()
    const { width, height } = (await paragraph.boundingBox())!
    await paragraph.click({ position: { x: width - 2, y: height / 2 } })
    await expect
        .poll(() =>
            editor(page).evaluate((element) => {
                const { state } = (element as HTMLElement & { editor: Editor }).editor
                return state.selection.from === state.doc.content.size - 1
            })
        )
        .toBe(true)
}

const story = async (mock: { state: () => Promise<{ stories: { id: number }[] }> }, id: number) => {
    const { stories } = await mock.state()
    return stories.find((candidate) => candidate.id === id) as unknown as {
        name: string
        slug: string
        published: boolean
        unpublished_changes: boolean
        tag_list: string[]
        content: Record<string, unknown>
    }
}

test.beforeEach(async ({ page }) => {
    await signIn(page)
})

test('lists, filters and searches posts', async ({ page }) => {
    const rows = page.getByRole('main').getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Draft post')
    await expect(rows.nth(0)).toContainText('Draft')
    await expect(rows.nth(1)).toContainText('Published')
    await expect(rows.nth(2)).toContainText('Unpublished changes')
    await expect(page.getByText('3 posts')).toBeVisible()

    await page.getByText('Drafts', { exact: true }).click()
    await expect(rows).toHaveCount(1)
    await expect(page).toHaveURL(/status=draft/)

    await page.getByText('All', { exact: true }).click()
    await page.getByPlaceholder('Search posts').fill('changed')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Changed post')
    await expect(page).toHaveURL(/q=changed/)

    await page.getByPlaceholder('Search posts').fill('nothing matches')
    await expect(page.getByText('No posts match your search.')).toBeVisible()
})

test('creates a post with an automatic slug', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    await dialog.getByLabel('Title').fill('Señales del Año')
    await expect(dialog.getByLabel('Slug')).toHaveValue('senales-del-ano')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/stories\/1000$/)
    await expect(page.getByLabel('Title *')).toHaveValue('Señales del Año')
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    const created = await story(mock, 1000)
    expect(created).toMatchObject({
        name: 'Señales del Año',
        slug: 'senales-del-ano',
        content: { component: 'Post', title: 'Señales del Año' },
    })
    expect(created.content.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('reports a taken slug and keeps the dialog open', async ({ page }) => {
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    await dialog.getByLabel('Title').fill('First post')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('alert')).toContainText('slug has already been taken')
    await expect(dialog).toBeVisible()
})

test('edits every field and saves with the keyboard shortcut', async ({ page, mock }) => {
    await page.getByRole('link', { name: /First post/ }).click()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

    await page.getByLabel('Title *').fill('First post, revised')
    await page.getByLabel('Intro *').fill('A better intro')
    await page.getByLabel('Date *').fill('2025-04-02')
    await page.getByRole('button', { name: 'Vue' }).click()
    await page.getByRole('button', { name: 'Rust' }).click()
    await expect(page.getByRole('button', { name: 'Design' })).toBeDisabled()
    await page.getByLabel('Author').selectOption('daniele')
    await page.getByLabel('Tags').fill('launch')
    await page.getByLabel('Tags').press('Enter')
    await page.getByLabel('Slug').fill('first-post-revised')

    const text = editor(page)
    await placeCaretAtEnd(page)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Bold', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true'
    )
    await page.getByRole('button', { name: 'Italic', exact: true }).click()
    await expect(text).toBeFocused()
    await page.keyboard.type('Strong ending')

    await expect(page.getByText('Unsaved changes')).toBeVisible()
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.getByText('Changes saved')).toBeVisible()
    await expect(page.getByText('Unsaved changes')).toBeHidden()
    await expect(page.getByText('Unpublished changes')).toBeVisible()

    const saved = await story(mock, 101)
    expect(saved).toMatchObject({
        slug: 'first-post-revised',
        tag_list: ['launch'],
        published: true,
        unpublished_changes: true,
        content: {
            title: 'First post, revised',
            intro: 'A better intro',
            date: '2025-04-02',
            categories: ['vue', 'rust'],
            author: 'daniele',
        },
    })
    expect(saved.content.long_text).toBe(
        '<p>Hello <strong>world</strong></p><p><strong><em>Strong ending</em></strong></p>'
    )
})

test('validates required fields before publishing', async ({ page, mock }) => {
    await page.goto('/stories/102')
    const intro = page.getByLabel('Intro *')
    await intro.fill('')
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Complete the required fields before publishing')).toBeVisible()
    await expect(page.getByText('This field is required')).toBeVisible()
    await expect(intro).toBeFocused()
    expect((await story(mock, 102)).published).toBe(false)

    await intro.fill('Now complete')
    await expect(page.getByText('This field is required')).toBeHidden()
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Post published')).toBeVisible()
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on website' })).toHaveAttribute(
        'href',
        'https://site.test/blog/draft-post'
    )
    expect(await story(mock, 102)).toMatchObject({
        published: true,
        content: { intro: 'Now complete' },
    })
})

test('unpublishes after confirmation', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByRole('button', { name: 'Unpublish' }).click()
    const dialog = page.getByRole('dialog', { name: 'Unpublish post' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    expect((await story(mock, 101)).published).toBe(true)

    await page.getByRole('button', { name: 'Unpublish' }).click()
    await dialog.getByRole('button', { name: 'Unpublish' }).click()
    await expect(page.getByText('Post unpublished')).toBeVisible()
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    expect((await story(mock, 101)).published).toBe(false)
})

test('duplicates a post', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByRole('button', { name: 'Duplicate' }).click()
    const dialog = page.getByRole('dialog', { name: 'Duplicate post' })
    await expect(dialog.getByLabel('Title')).toHaveValue('First post (copy)')
    await expect(dialog.getByLabel('Slug')).toHaveValue('first-post-copy')
    await dialog.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page).toHaveURL(/\/stories\/1000$/)
    await expect(page.getByText('Post duplicated')).toBeVisible()
    expect(await story(mock, 1000)).toMatchObject({
        name: 'First post (copy)',
        slug: 'first-post-copy',
        content: { title: 'First post' },
    })
})

test('deletes a post after confirmation', async ({ page, mock }) => {
    await page.goto('/stories/102')
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
        .getByRole('dialog', { name: 'Delete post' })
        .getByRole('button', { name: 'Delete post' })
        .click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Post deleted')).toBeVisible()
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2)
    expect(await story(mock, 102)).toBeUndefined()
})

test('guards unsaved changes when leaving', async ({ page }) => {
    await page.goto('/stories/101')
    await page.getByLabel('Title *').fill('Unsaved title')
    await page.getByRole('link', { name: 'Media' }).click()
    const dialog = page.getByRole('dialog', { name: 'Discard changes?' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/stories\/101$/)
    await expect(page.getByLabel('Title *')).toHaveValue('Unsaved title')

    await page.getByRole('link', { name: 'Media' }).click()
    await dialog.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page).toHaveURL(/\/media$/)
})

test('inserts links, embeds and library images into rich text', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await placeCaretAtEnd(page)

    await page.getByRole('button', { name: 'Link' }).click()
    const linkDialog = page.getByRole('dialog', { name: 'Insert link' })
    await linkDialog.getByLabel('URL').fill('example.com/docs')
    await linkDialog.getByRole('button', { name: 'Insert' }).click()

    await page.getByRole('button', { name: 'Embed video' }).click()
    const embedDialog = page.getByRole('dialog', { name: 'Embed video' })
    await embedDialog.getByLabel('Video URL').fill('https://youtu.be/dQw4w9WgXcQ?t=30')
    await embedDialog.getByRole('button', { name: 'Insert' }).click()

    await page.getByRole('button', { name: 'Image', exact: true }).click()
    const imageDialog = page.getByRole('dialog', { name: 'Insert image' })
    await imageDialog.getByRole('button', { name: 'Choose from library' }).click()
    await page
        .getByRole('dialog', { name: 'Media library' })
        .getByRole('button', { name: 'Open cover.png' })
        .click()
    await imageDialog.getByLabel('Alt text').fill('The cover')
    await imageDialog.getByLabel('Caption').fill('A caption')
    await imageDialog.getByRole('button', { name: 'Insert' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await story(mock, 101)).content.long_text).toBe(
        '<p>Hello <strong>world</strong><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/docs">https://example.com/docs</a></p>' +
            '<div><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=30" frameborder="0" allowfullscreen="true" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>' +
            '<figure><img src="https://a.storyblok.com/f/1/800x600/301/cover.png" alt="The cover"><figcaption>A caption</figcaption></figure><p></p>'
    )
})

test('uploads images dropped into the editor', async ({ page, mock, storage }) => {
    await page.goto('/stories/101')
    const text = editor(page)
    const box = (await text.boundingBox())!
    const transfer = await page.evaluateHandle(
        ({ name, data }) => {
            const dataTransfer = new DataTransfer()
            const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
            dataTransfer.items.add(new File([bytes], name, { type: 'image/png' }))
            return dataTransfer
        },
        { name: 'dropped.png', data: png('dropped.png').buffer.toString('base64') }
    )
    await text.dispatchEvent('drop', {
        dataTransfer: transfer,
        clientX: box.x + 20,
        clientY: box.y + box.height - 5,
    })
    await expect(text.locator('figure img')).toHaveAttribute(
        'src',
        /^https:\/\/a\.storyblok\.com\/f\/1\/1x1\/\d+\/dropped\.png$/
    )
    expect(storage.map(({ fileName }) => fileName)).toEqual(['dropped.png'])
    const uploaded = (await mock.state()).assets.find(
        ({ short_filename }) => short_filename === 'dropped.png'
    )
    expect(uploaded).toMatchObject({ finished: true, asset_folder_id: null })
})

test('picks a cover asset with alt text', async ({ page, mock }) => {
    await page.goto('/stories/102')
    await page.getByRole('button', { name: 'Choose file' }).click()
    await page
        .getByRole('dialog', { name: 'Media library' })
        .getByRole('button', { name: 'Open cover.png' })
        .click()
    await page.getByPlaceholder('Alt text').fill('Cover alt')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await story(mock, 102)).content.file).toMatchObject({
        id: 301,
        filename: 'https://a.storyblok.com/f/1/800x600/301/cover.png',
        alt: 'Cover alt',
        fieldtype: 'asset',
    })

    await page.getByRole('button', { name: 'Remove' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toHaveCount(1)
    await expect
        .poll(async () => ((await story(mock, 102)).content.file as { filename: string }).filename)
        .toBe('')
})

test('moves between toolbar buttons with the arrow keys', async ({ page }) => {
    await page.goto('/stories/101')
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' })
    await toolbar.getByRole('button', { name: 'Bold', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(toolbar.getByRole('button', { name: 'Italic', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(toolbar.getByRole('button', { name: 'Copy as Markdown' })).toBeFocused()
})

test('restores a previous version from the history', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByRole('button', { name: 'Version history' }).click()
    const dialog = page.getByRole('dialog', { name: 'Version history' })
    await expect(dialog.getByText('Published · Editor')).toBeVisible()
    await dialog.getByRole('button', { name: 'Restore' }).click()
    await page
        .getByRole('dialog', { name: 'Restore version' })
        .getByRole('button', { name: 'Restore version' })
        .click()
    await expect(page.getByText('Version restored')).toBeVisible()
    await expect(page.getByLabel('Title *')).toHaveValue('Original title')
    await expect(page.getByText('Unpublished changes')).toBeVisible()
    expect((await story(mock, 101)).content.title).toBe('Original title')
})

test('locks version restore while there are unsaved changes', async ({ page }) => {
    await page.goto('/stories/101')
    await page.getByLabel('Title *').fill('Pending edit')
    await page.getByRole('button', { name: 'Version history' }).click()
    const dialog = page.getByRole('dialog', { name: 'Version history' })
    await expect(
        dialog.getByText('Save or discard your changes before restoring a version.')
    ).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Restore' })).toBeDisabled()
})

test('moves a post through the workflow stages', async ({ page, mock }) => {
    await page.goto('/stories/101')
    const stage = page.getByLabel('Workflow stage')
    await expect(stage.locator('option')).toHaveText(['Not set', 'Drafting', 'Reviewing'])
    await stage.selectOption({ label: 'Reviewing' })
    await expect(page.getByText('Workflow stage updated')).toBeVisible()
    await expect(stage).toHaveValue('2')
    expect((await mock.state()).stories.find(({ id }) => id === 101)?.stage).toEqual({
        workflow_stage_id: 2,
    })
})

test('autosaves drafts after a pause in typing', async ({ page, mock }) => {
    await page.goto('/stories/102')
    await page.getByLabel('Intro *').fill('Saved without pressing anything')
    await expect(page.getByText('Unsaved changes')).toBeVisible()
    await expect(page.getByText('Unsaved changes')).toBeHidden({ timeout: 10_000 })
    await expect(page.getByText('Changes saved')).toBeHidden()
    expect(await story(mock, 102)).toMatchObject({
        published: false,
        content: { intro: 'Saved without pressing anything' },
    })
})

test('edits translations and translates with AI', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByText('Spanish', { exact: true }).click()
    await expect(page.getByText('Editing the Spanish version.')).toBeVisible()
    await expect(page.getByLabel('Date *')).toBeHidden()
    await expect(page.getByLabel('Title *')).toHaveValue('')

    await page.getByRole('button', { name: 'Translate with AI' }).click()
    await page
        .getByRole('dialog', { name: 'Translate with AI' })
        .getByRole('button', { name: 'Translate' })
        .click()
    await expect(page.getByText('Translation added. Review it and save.')).toBeVisible()
    await expect(page.getByLabel('Title *')).toHaveValue('[es] First post')
    await expect(page.getByRole('button', { name: 'Translate with AI' })).toBeDisabled()

    await page.getByLabel('Title *').fill('Primera entrada')
    await page.getByText('English', { exact: true }).click()
    await expect(page.getByLabel('Title *')).toHaveValue('First post')
    await expect(page.getByLabel('Date *')).toBeVisible()

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await story(mock, 101)).content).toMatchObject({
        title: 'First post',
        title__i18n__es: 'Primera entrada',
        intro__i18n__es: '[es] Intro of First post',
        long_text__i18n__es: '[es] <p>Hello <strong>world</strong></p>',
    })
})
