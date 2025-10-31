async function hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function validateCredentials(email, password) {
    const validEmail = import.meta.env.STORY_AUTH_EMAIL
    const validPasswordHash = import.meta.env.STORY_AUTH_PASSWORD

    if (!validEmail || !validPasswordHash) {
        return { success: false, error: 'Configuration error' }
    }

    const passwordHash = await hashPassword(password)

    if (email === validEmail && passwordHash === validPasswordHash) {
        const token = btoa(`${Date.now()}:${email}`)
        return { success: true, user: { email }, token }
    }

    return { success: false, error: 'Invalid credentials' }
}
