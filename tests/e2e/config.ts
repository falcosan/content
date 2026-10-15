const mockPort = 4010
const appPort = 5180

export const E2E = {
    mockPort,
    appPort,
    mockUrl: `http://localhost:${mockPort}`,
    appUrl: `http://localhost:${appPort}`,
    space: 1,
    token: 'e2e-token',
    siteUrl: 'https://site.test/',
    user: 'editor',
    password: 'e2e-password',
}
