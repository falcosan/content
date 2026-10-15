import { expect, signIn, submitCredentials, test } from './fixtures'

test('redirects anonymous visitors to sign in and back', async ({ page }) => {
    await page.goto('/media')
    await expect(page).toHaveURL(/\/login\?redirect=\/media$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await submitCredentials(page)
    await expect(page).toHaveURL(/\/media$/)
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible()
})

test('rejects wrong credentials and clears the password', async ({ page }) => {
    await page.goto('/login')
    await submitCredentials(page, 'wrong-password')
    await expect(page.getByRole('alert')).toHaveText('Invalid credentials')
    await expect(page.getByLabel('Password')).toHaveValue('')
    await expect(page).toHaveURL(/\/login$/)
})

test('keeps the session in an HttpOnly cookie and signs out', async ({ page, context }) => {
    await signIn(page)
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link')).toHaveText(['Posts', 'Media'])
    const [cookie] = await context.cookies()
    expect(cookie).toMatchObject({
        name: 'session',
        httpOnly: true,
        sameSite: 'Strict',
        path: '/api',
    })
    expect(await page.evaluate(() => document.cookie)).toBe('')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await context.cookies()).toEqual([])
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
})

test('asks before signing out with unsaved changes', async ({ page, context }) => {
    await signIn(page, '/stories/101')
    await page.getByLabel('Title *').fill('Unsaved title')
    await page.getByRole('button', { name: 'Sign out' }).click()
    const dialog = page.getByRole('dialog', { name: 'Discard changes?' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByLabel('Title *')).toHaveValue('Unsaved title')
    expect(await context.cookies()).toHaveLength(1)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await dialog.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await context.cookies()).toEqual([])
})

test('shows a not found page for unknown routes', async ({ page }) => {
    await signIn(page)
    await page.goto('/nope')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('lets the user sign in again when the session expires without losing edits', async ({
    page,
    context,
}) => {
    await signIn(page, '/stories/102')
    const title = page.getByLabel('Title *')
    await title.fill('Edited while expired')
    await context.clearCookies()
    await page.keyboard.press('ControlOrMeta+s')
    const dialog = page.getByRole('dialog', { name: 'Session expired' })
    await expect(dialog).toBeVisible()
    await submitCredentials(dialog)
    await expect(dialog).toBeHidden()
    await expect(title).toHaveValue('Edited while expired')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
})
