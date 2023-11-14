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
        const db = createClient(process.env.STORY_SUPABASE_URL, process.env.STORY_SUPABASE_TOKEN)
        db.auth.onAuthStateChange((_, session) => {
            if (session) {
                auth.value = auth.value ? { ...auth.value, ...session.user } : session.user
                logged.value = true
            }
        })
        loading.value = false
        if (!logged.value) setCookie('path', window.location.href)
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
                    setCookie('auth', val)
                    window.location.replace(getCookie('path') ?? '/')
                    deleteCookie('path')
                }
            } else {
                deleteCookie('auth')
                logged.value = false
                window.location.reload()
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
