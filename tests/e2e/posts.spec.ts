import type { Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'
import type { Asset } from '#types/api'
import { E2E } from './config'
import { expect, fileTransfer, hold, png, signIn, test } from './fixtures'

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

test.beforeEach(async ({ page }) => {
    await signIn(page)
})

test('lists, filters and searches posts', async ({ page }) => {
    const rows = page.getByRole('main').getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Draft post')
    await expect(rows.nth(0).getByText('Draft', { exact: true })).toBeVisible()
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
    await expect(page.getByText('No posts match your filters.')).toBeVisible()

    await page.route(
        (url) => url.pathname === '/api/stories' && url.searchParams.get('status') === 'published',
        async (route) => {
            const response = await route.fetch()
            await route.fulfill({
                response,
                json: { ...(await response.json()), stories: [], total: 0 },
            })
        }
    )
    await page.getByPlaceholder('Search posts').clear()
    await page.getByRole('radiogroup', { name: 'Status' }).getByText('Published').click()
    await expect(page.getByText('No posts match your filters.')).toBeVisible()
})

test('resets the filters when the posts link is followed', async ({ page }) => {
    await page.goto('/?status=draft&q=draft')
    const rows = page.getByRole('main').getByRole('listitem')
    await expect(rows).toHaveCount(1)
    await expect(page.getByPlaceholder('Search posts')).toHaveValue('draft')
    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'Posts' })
        .click()
    await expect(page).toHaveURL(E2E.appUrl + '/')
    await expect(rows).toHaveCount(3)
    await expect(page.getByPlaceholder('Search posts')).toHaveValue('')
    await expect(page.getByRole('radio', { name: 'All' })).toBeChecked()
})

test('keeps the loaded posts when loading more fails', async ({ page }) => {
    await page.route(
        (url) => url.pathname === '/api/stories',
        async (route) => {
            if (new URL(route.request().url()).searchParams.get('page') === '2') {
                return route.fulfill({ status: 500, json: { error: 'Storyblok is down' } })
            }
            const response = await route.fetch()
            const body: { perPage: number } = await response.json()
            await route.fulfill({ response, json: { ...body, total: body.perPage + 1 } })
        }
    )
    await page.reload()
    const rows = page.getByRole('main').getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await page.getByRole('button', { name: 'Load more' }).click()
    await expect(page.getByRole('alert')).toContainText('Storyblok is down')
    await expect(rows).toHaveCount(3)
})

test('never shows the previous status while another one loads', async ({ page }) => {
    const release = await hold(
        page,
        (url) => url.pathname === '/api/stories' && url.searchParams.get('status') === 'draft'
    )
    await page.getByText('Drafts', { exact: true }).click()
    await expect(page.getByRole('list', { name: 'Loading posts' })).toBeVisible()
    await expect(page.getByRole('link', { name: /First post/ })).toHaveCount(0)
    release()
    await expect(page.getByRole('link', { name: /Draft post/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /First post/ })).toHaveCount(0)
})

test('shows long intros in full in the list', async ({ page }) => {
    const intro =
        'An introduction that is clearly longer than the fifty characters Storyblok keeps in summaries'
    await page.goto('/stories/101')
    await page.getByLabel('Intro *').fill(intro)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    await page.getByRole('button', { name: 'Back to posts' }).click()
    await expect(page.getByText(intro, { exact: true })).toBeVisible()
})

test('never scrolls sideways on a 320px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.route(
        (url) => url.pathname === '/api/assets',
        async (route) => {
            const response = await route.fetch()
            const body: { assets: Asset[] } = await response.json()
            Object.assign(body.assets[1]!, {
                size: null,
                contentType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            } satisfies Partial<Asset>)
            await route.fulfill({ response, json: body })
        }
    )
    const pages = [
        { path: '/', ready: page.getByRole('link', { name: /First post/ }) },
        { path: '/stories/101', ready: page.getByLabel('Title *') },
        { path: '/media', ready: page.getByRole('button', { name: 'Open cover.png' }) },
    ]
    for (const { path, ready } of pages) {
        await page.goto(path)
        await expect(ready).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    }
})

test('creates a post named after its title with an automatic slug', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    await expect(dialog.getByRole('textbox')).toHaveCount(1)
    await dialog.getByLabel('Title').fill('Notes on Café Culture')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/stories\/1000$/)
    await expect(page.getByLabel('Title *')).toHaveValue('Notes on Café Culture')
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    const created = await mock.story(1000)
    expect(created).toMatchObject({
        name: 'Notes on Café Culture',
        slug: 'notes-cafe-culture',
        content: { component: 'Post', title: 'Notes on Café Culture' },
    })
    expect(created.content.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('numbers the slug when another post already uses it', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    await dialog.getByLabel('Title').fill('First post')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/stories\/1000$/)
    expect(await mock.story(1000)).toMatchObject({ name: 'First post', slug: 'first-post-2' })
})

test('reports a failed creation and keeps the dialog open', async ({ page }) => {
    await page.route('**/api/stories', (route) =>
        route.request().method() === 'POST'
            ? route.fulfill({ status: 409, json: { error: 'Too many posts share this title' } })
            : route.continue()
    )
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    await dialog.getByLabel('Title').fill('First post')
    await dialog.getByRole('button', { name: 'Create' }).click()
    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText('Too many posts share this title')
    await alert.getByRole('button', { name: 'Dismiss' }).click()
    await expect(alert).toBeHidden()
    await expect(dialog).toBeVisible()
})

test('closes dialogs from the backdrop but not when a selection ends there', async ({ page }) => {
    await page.getByRole('button', { name: 'New post' }).click()
    const dialog = page.getByRole('dialog', { name: 'New post' })
    const title = dialog.getByLabel('Title')
    await title.fill('Keep me')
    const box = (await title.boundingBox())!
    await page.mouse.move(box.x + 8, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(4, 4, { steps: 4 })
    await page.mouse.up()
    await expect(dialog).toBeVisible()
    await expect(title).toHaveValue('Keep me')

    await page.mouse.move(4, 4)
    await page.mouse.down()
    await page.mouse.move(box.x + 8, box.y + box.height / 2, { steps: 4 })
    await page.mouse.up()
    await expect(dialog).toBeVisible()

    await page.mouse.click(4, 4)
    await expect(dialog).toBeHidden()
})

test('keeps toasts visible after a dialog disappears while open', async ({ page }) => {
    await page.getByRole('link', { name: /First post/ }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.getByRole('dialog', { name: 'Duplicate post' })).toBeVisible()
    await page.goBack()
    await page.getByRole('link', { name: /First post/ }).click()
    await page.getByLabel('Title *').fill('Still visible')
    await page.getByRole('button', { name: 'Save' }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Changes saved' })
    await expect(toast).toBeVisible()
    await toast.getByRole('button', { name: 'Dismiss' }).click()
    await expect(toast).toBeHidden()
})

test('titles the tab after the post and then after the next page', async ({ page }) => {
    await page.getByRole('link', { name: /First post/ }).click()
    await expect(page).toHaveTitle('First post · AP | Editor')
    await page.getByRole('link', { name: 'Media' }).click()
    await expect(page).toHaveTitle('Media · AP | Editor')
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
    await expect(page.getByText('Align text')).toHaveCount(0)
    await expect(page.getByLabel('Story name')).toHaveCount(0)
    await expect(page.getByLabel('Slug')).toHaveCount(0)
    await expect(page.getByRole('radiogroup', { name: 'Language' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Translate with AI' })).toHaveCount(0)

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

    const saved = await mock.story(101)
    expect(saved).toMatchObject({
        name: 'First post, revised',
        slug: 'first-post',
        published: true,
        unpublished_changes: true,
        content: {
            title: 'First post, revised',
            intro: 'A better intro',
            date: '2025-04-02',
            categories: ['vue', 'rust'],
            author: 'daniele',
            align_text: 'center',
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
    expect((await mock.story(102)).published).toBe(false)

    await intro.fill('Now complete')
    await expect(page.getByText('This field is required')).toBeHidden()
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Post published')).toBeVisible()
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on website' })).toHaveAttribute(
        'href',
        `${E2E.siteUrl}blog/draft-post`
    )
    expect(await mock.story(102)).toMatchObject({
        published: true,
        content: { intro: 'Now complete' },
    })
})

test('unpublishes after confirmation', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByRole('button', { name: 'Unpublish' }).click()
    const dialog = page.getByRole('dialog', { name: 'Unpublish post' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    expect((await mock.story(101)).published).toBe(true)

    await page.getByRole('button', { name: 'Unpublish' }).click()
    await dialog.getByRole('button', { name: 'Unpublish' }).click()
    await expect(page.getByText('Post unpublished')).toBeVisible()
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    expect((await mock.story(101)).published).toBe(false)
})

test('duplicates a post', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await page.getByRole('button', { name: 'Duplicate' }).click()
    const dialog = page.getByRole('dialog', { name: 'Duplicate post' })
    await expect(dialog.getByRole('textbox')).toHaveCount(1)
    await expect(dialog.getByLabel('Title')).toHaveValue('First post (copy)')
    await dialog.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page).toHaveURL(/\/stories\/1000$/)
    await expect(page.getByText('Post duplicated')).toBeVisible()
    await expect(page.getByLabel('Title *')).toHaveValue('First post (copy)')
    expect(await mock.story(1000)).toMatchObject({
        name: 'First post (copy)',
        slug: 'first-post-copy',
        parent_id: 1,
        published: false,
        content: { title: 'First post (copy)', intro: 'Intro of First post' },
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
    expect((await mock.state()).stories.some(({ id }) => id === 102)).toBe(false)
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

test('never saves changes the user discarded', async ({ page, mock }) => {
    const puts: string[] = []
    page.on('request', (request) => {
        if (request.method() === 'PUT') puts.push(request.url())
    })
    await page.clock.install()
    await page.goto('/stories/101')
    await page.getByLabel('Title *').fill('Discarded title')
    await page.getByRole('link', { name: 'Media' }).click()
    const dialog = page.getByRole('dialog', { name: 'Discard changes?' })
    await expect(dialog).toBeVisible()
    await page.clock.runFor(10_000)
    await dialog.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page).toHaveURL(/\/media$/)
    await page.clock.runFor(10_000)
    await page.getByRole('link', { name: 'Posts' }).click()
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(3)
    expect(puts).toEqual([])
    expect((await mock.story(101)).content.title).toBe('First post')
})

test('keeps the slug in step with the title until the post is published', async ({
    page,
    mock,
}) => {
    await page.goto('/stories/102')
    const title = page.getByLabel('Title *')
    await title.fill('The Draft, Renamed')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect(await mock.story(102)).toMatchObject({
        name: 'The Draft, Renamed',
        slug: 'draft-renamed',
    })

    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Post published')).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on website' })).toHaveAttribute(
        'href',
        `${E2E.siteUrl}blog/draft-renamed`
    )

    await title.fill('Renamed Once More')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Unsaved changes')).toBeHidden()
    await expect
        .poll(async () => {
            const { name, slug } = await mock.story(102)
            return { name, slug }
        })
        .toEqual({ name: 'Renamed Once More', slug: 'draft-renamed' })
})

test('ignores the save shortcut when nothing changed', async ({ page }) => {
    const puts: string[] = []
    page.on('request', (request) => {
        if (request.method() === 'PUT') puts.push(request.url())
    })
    await page.goto('/stories/101')
    const title = page.getByLabel('Title *')
    await expect(title).toHaveValue('First post')
    await page.keyboard.press('ControlOrMeta+s')
    await title.fill('First post!')
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect(puts).toHaveLength(1)
})

test('keeps the editor when a background refresh fails', async ({ page }) => {
    await page.goto('/stories/101')
    await expect(page.getByLabel('Title *')).toHaveValue('First post')
    await page.route('**/api/stories/101', (route) =>
        route.request().method() === 'GET'
            ? route.fulfill({ status: 404, json: { error: 'Story not found' } })
            : route.continue()
    )
    await page.getByRole('button', { name: 'Unpublish' }).click()
    await page
        .getByRole('dialog', { name: 'Unpublish post' })
        .getByRole('button', { name: 'Unpublish' })
        .click()
    await expect(page.getByText('Post unpublished')).toBeVisible()
    await expect(page.getByLabel('Title *')).toHaveValue('First post')
    await expect(page.getByRole('heading', { name: 'Post not found' })).toHaveCount(0)
})

test('explains when the post schema cannot be loaded', async ({ page }) => {
    await page.route('**/api/schema/fields', (route) =>
        route.fulfill({ status: 500, json: { error: 'Component Post not found' } })
    )
    await page.goto('/stories/101')
    await expect(page.getByRole('heading', { name: 'Could not load the post' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Component Post not found')
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
        .getByRole('button', { name: 'Choose cover.png' })
        .click()
    await imageDialog.getByLabel('Alt text').fill('The cover')
    await imageDialog.getByLabel('Caption').fill('A caption')
    await imageDialog.getByRole('button', { name: 'Insert' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await mock.story(101)).content.long_text).toBe(
        '<p>Hello <strong>world</strong><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/docs">https://example.com/docs</a></p>' +
            '<div><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=30" frameborder="0" allowfullscreen="true" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>' +
            '<figure><img src="https://a.storyblok.com/f/1/800x600/301/cover.png" alt="The cover"><figcaption>A caption</figcaption></figure><p></p>'
    )
})

test('keeps the code language picker clear of the code', async ({ page, mock }) => {
    await page.goto('/stories/101')
    await placeCaretAtEnd(page)
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Code block' }).click()
    await page.keyboard.type('const answer = 42')
    const picker = page.getByLabel('Code language')
    await picker.selectOption({ label: 'JavaScript' })
    const pickerBox = (await picker.boundingBox())!
    const codeBox = (await editor(page).locator('pre code').boundingBox())!
    expect(pickerBox.y + pickerBox.height).toBeLessThanOrEqual(codeBox.y)

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await mock.story(101)).content.long_text).toContain(
        '<pre><code class="language-javascript">const answer = 42</code></pre>'
    )
})

test('uploads images dropped into the editor', async ({ page, mock, storage }) => {
    await page.goto('/stories/101')
    const text = editor(page)
    const box = (await text.boundingBox())!
    const transfer = await fileTransfer(page, 'dropped.png')
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
    await page.getByRole('button', { name: 'Choose from library' }).click()
    await page
        .getByRole('dialog', { name: 'Media library' })
        .getByRole('button', { name: 'Choose cover.png' })
        .click()
    await page.getByPlaceholder('Alt text').fill('Cover alt')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await mock.story(102)).content.file).toMatchObject({
        id: 301,
        filename: 'https://a.storyblok.com/f/1/800x600/301/cover.png',
        alt: 'Cover alt',
        fieldtype: 'asset',
    })

    await page.getByRole('button', { name: 'Remove' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toHaveCount(1)
    await expect
        .poll(async () => ((await mock.story(102)).content.file as { filename: string }).filename)
        .toBe('')
})

test('keeps looking past library pages without matching files', async ({ page }) => {
    const notes = {
        id: 999,
        url: 'https://a.storyblok.com/f/1/notes.pdf',
        name: 'notes.pdf',
        contentType: 'application/pdf',
        size: 10,
        width: null,
        height: null,
        alt: '',
        title: '',
        copyright: '',
        source: '',
        folderId: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        deletedAt: null,
    } satisfies Asset
    await page.route(/\/api\/assets\?(?=.*page=1)/, async (route) => {
        const response = await route.fetch()
        const body: { perPage: number } = await response.json()
        await route.fulfill({
            response,
            json: { ...body, assets: [notes], total: body.perPage + 1 },
        })
    })
    await page.goto('/stories/102')
    await page.getByRole('button', { name: 'Choose from library' }).click()
    const library = page.getByRole('dialog', { name: 'Media library' })
    await expect(library.getByText('No matching files on the loaded pages yet.')).toBeVisible()
    await expect(library.getByText('Drop files here or use Upload.')).toBeHidden()
    await expect(library.getByRole('button', { name: 'Load more' })).toBeVisible()
})

test('adds categories from the post, sorted and saved in the schema', async ({ page, mock }) => {
    await page.goto('/stories/102')
    const categories = page.getByRole('group', { name: 'Categories' })
    const chips = categories.locator('[aria-pressed]')
    const input = categories.getByLabel('New option')
    await input.fill('Machine Learning')
    await input.press('Enter')
    await expect(page.getByText('“Machine Learning” added')).toBeVisible()
    await expect(input).toHaveValue('')
    await expect(chips).toHaveText(['Design', 'Machine Learning', 'Rust', 'Vue'])
    await expect(chips.filter({ hasText: 'Machine Learning' })).toHaveAttribute(
        'aria-pressed',
        'true'
    )
    const [schema] = (await mock.state()).components
    expect(schema?.schema.categories?.options?.map(({ name, value }) => [name, value])).toEqual([
        ['Design', 'design'],
        ['Machine Learning', 'machinelearning'],
        ['Rust', 'rust'],
        ['Vue', 'vue'],
    ])

    await input.fill('rust')
    await categories.getByRole('button', { name: 'Add' }).click()
    await expect(chips.filter({ hasText: 'Rust' })).toHaveAttribute('aria-pressed', 'true')
    await expect(chips).toHaveCount(4)

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await mock.story(102)).content.categories).toEqual(['machinelearning', 'rust'])

    await page.reload()
    await expect(chips).toHaveText(['Design', 'Machine Learning', 'Rust', 'Vue'])
    await expect(chips.filter({ hasText: 'Machine Learning' })).toHaveAttribute(
        'aria-pressed',
        'true'
    )
})

test('uses an image URL as the cover', async ({ page, mock }) => {
    const url = 'https://images.example.test/cover.png'
    await page.route(url, (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: png('cover.png').buffer })
    )
    await page.goto('/stories/102')
    const input = page.getByLabel('Image URL')
    await input.fill('http://images.example.test/cover.png')
    await input.blur()
    await expect(page.getByText('Enter a valid https URL')).toBeVisible()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveValue('http://images.example.test/cover.png')

    await input.fill(url)
    await input.blur()
    await expect(page.getByText('Enter a valid https URL')).toBeHidden()
    await expect(page.locator(`img[src="${url}"]`)).toBeVisible()
    await page.getByPlaceholder('Alt text').fill('External cover')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    expect((await mock.story(102)).content.file).toMatchObject({
        id: null,
        filename: url,
        alt: 'External cover',
        is_external_url: true,
        fieldtype: 'asset',
    })

    await input.fill('')
    await input.blur()
    await expect(page.locator(`img[src="${url}"]`)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Choose from library' })).toBeVisible()
})

test('offers the post actions in a menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/stories/101')
    await expect(page.getByRole('button', { name: 'Version history' })).toBeHidden()
    await page.getByRole('button', { name: 'More actions' }).click()
    const menu = page.getByRole('menu', { name: 'More actions' })
    await expect(menu.getByRole('menuitem')).toHaveText([
        'View on website',
        'Version history',
        'Duplicate',
        'Unpublish',
        'Delete',
    ])
    await expect(menu.getByRole('menuitem', { name: 'View on website' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(menu.getByRole('menuitem', { name: 'View on website' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(menu).toBeHidden()

    await page.getByRole('button', { name: 'More actions' }).click()
    await expect(menu.getByRole('menuitem', { name: 'View on website' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: 'Version history' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(menu).toBeHidden()
    await expect(page.getByRole('dialog', { name: 'Version history' })).toBeVisible()
})

test('keeps one tab stop in the toolbar and moves inside it with the arrow keys', async ({
    page,
}) => {
    await page.goto('/stories/101')
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' })
    await page.getByLabel('Intro *').focus()
    await page.keyboard.press('Tab')
    await expect(toolbar.getByLabel('Text style')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    const bold = toolbar.getByRole('button', { name: 'Bold', exact: true })
    await expect(bold).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(editor(page)).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(bold).toBeFocused()
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
    expect((await mock.story(101)).content.title).toBe('Original title')
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

test('autosaves drafts after a pause in typing', async ({ page, mock }) => {
    await page.clock.install()
    await page.goto('/stories/102')
    await page.getByLabel('Intro *').fill('Saved without pressing anything')
    await expect(page.getByText('Unsaved changes')).toBeVisible()
    const saved = page.waitForResponse(
        (response) =>
            response.url().endsWith('/api/stories/102') && response.request().method() === 'PUT'
    )
    await page.clock.runFor(4000)
    await saved
    await expect(page.getByText('Unsaved changes')).toBeHidden()
    await expect(page.getByText('Changes saved')).toBeHidden()
    expect(await mock.story(102)).toMatchObject({
        published: false,
        content: { intro: 'Saved without pressing anything' },
    })
})
