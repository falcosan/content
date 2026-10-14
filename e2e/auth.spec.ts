import { E2E } from './config'
import { expect, signIn, test } from './fixtures'

test('redirects anonymous visitors to sign in and back', async ({ page }) => {
    await page.goto('/media')
    await expect(page).toHaveURL(/\/login\?redirect=\/media$/)
    await page.getByLabel('Email or username').fill(E2E.user)
    await page.getByLabel('Password').fill(E2E.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/media$/)
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible()
})

test('rejects wrong credentials and clears the password', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email or username').fill(E2E.user)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Invalid credentials')
    await expect(page.getByLabel('Password')).toHaveValue('')
    await expect(page).toHaveURL(/\/login$/)
})

test('keeps the session in an HttpOnly cookie and signs out', async ({ page, context }) => {
    await signIn(page)
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible()
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

test('redirects legacy editor links to the post', async ({ page }) => {
    await signIn(page)
    await page.goto('/?id=101&type=post')
    await expect(page).toHaveURL(/\/stories\/101$/)
    await expect(page.getByLabel('Title *')).toHaveValue('First post')
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
    await dialog.getByLabel('Email or username').fill(E2E.user)
    await dialog.getByLabel('Password').fill(E2E.password)
    await dialog.getByRole('button', { name: 'Sign in' }).click()
    await expect(dialog).toBeHidden()
    await expect(title).toHaveValue('Edited while expired')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
})
