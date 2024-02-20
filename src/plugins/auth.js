import { router } from '@/router'
import { createClient } from '@supabase/supabase-js'
import { reactive, toRefs, watch, computed } from 'vue'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'
export default {
    install: (app) => {
        const state = reactive({
            auth: null,
            logged: false,
            loading: true,
        })
        const { auth, logged, loading } = toRefs(state)
        const db = createClient(
            import.meta.env.STORY_SUPABASE_URL,
            import.meta.env.STORY_SUPABASE_TOKEN
        )
        db.auth.onAuthStateChange((_, session) => {
            if (session) {
                auth.value = auth.value ? { ...auth.value, ...session.user } : session.user
                logged.value = true
            } else {
                loading.value = false
            }
        })
        if (!logged.value) setCookie('path', `${window.location.pathname}${window.location.search}`)
        watch(logged, async (val) => {
            if (val) {
                const user = auth.value
                const { data, error } = await db.from('profiles').select('*').eq('id', user.id)
                if (error) console.table(error)
                else if (data?.length) auth.value = { ...user, ...data[0] }
            }
        })
        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    setCookie('auth', val.aud)
                    router.push(getCookie('path') ?? '/')
                    deleteCookie('path')
                }
            } else {
                deleteCookie('auth')
                logged.value = false
                router.push('/login')
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
