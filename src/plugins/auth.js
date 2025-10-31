import { validateCredentials } from '@/utils/auth'
import { reactive, toRefs, watch, computed } from 'vue'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'

export default {
    install: (app) => {
        const state = reactive({
            auth: null,
            logged: false,
            loading: false,
        })
        const { auth, logged, loading } = toRefs(state)

        const checkAuth = () => {
            const authToken = getCookie('auth')
            if (authToken) {
                logged.value = true
            } else if (!/login/.test(window.location.pathname)) {
                logged.value = false
                location.assign('/login')
                setCookie('path', `${window.location.pathname}${window.location.search}`)
            }
        }

        checkAuth()

        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    setCookie('auth', val.token)
                    location.assign(getCookie('path') ?? '/')
                    deleteCookie('path')
                } else {
                    logged.value = true
                }
            }
        })

        const authService = {
            async signInWithPassword({ email, password }) {
                const result = await validateCredentials(email, password)

                if (result.success) {
                    return { data: result, error: null }
                }

                return { data: null, error: { message: result.error, status: 401 } }
            },
            signOut() {
                deleteCookie('auth')
                auth.value = null
                logged.value = false
                location.assign('/login')
            },
        }

        app.provide('authService', authService)
        app.provide('logged', logged)
        app.provide(
            'loading',
            computed({
                get: () => loading.value ?? {},
                set: (val) => (loading.value = val),
            })
        )
        app.provide(
            'auth',
            computed({
                get: () => auth.value ?? {},
                set: (val) => (auth.value = val),
            })
        )
    },
}
