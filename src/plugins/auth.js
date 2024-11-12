import { createClient } from '@supabase/supabase-js'
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
        const db = createClient(
            import.meta.env.STORY_SUPABASE_URL,
            import.meta.env.STORY_SUPABASE_TOKEN
        )
        db.auth.onAuthStateChange((_, session) => {
            if (session) logged.value = true
            else if (!/login/.test(window.location.pathname)) {
                deleteCookie('auth')
                logged.value = false
                location.assign('/login')
            }
        })
        if (!logged.value) setCookie('path', `${window.location.pathname}${window.location.search}`)
        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    setCookie('auth', val.aud)
                    location.assign(getCookie('path') ?? '/')
                    deleteCookie('path')
                }
            }
        })
        app.provide('db', db)
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
