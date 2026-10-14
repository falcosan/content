const mockPort = 4010
const appPort = 5180

export const E2E = {
    mockPort,
    appPort,
    mockUrl: `http://localhost:${mockPort}`,
    appUrl: `http://localhost:${appPort}`,
    token: 'e2e-token',
    user: 'editor',
    password: 'e2e-password',
}
