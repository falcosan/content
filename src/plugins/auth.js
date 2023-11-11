import { ref, watch, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'
export default {
    install: (app) => {
        const auth = ref(null)
        const db = createClient(process.env.STORY_SUPABASE_URL, process.env.STORY_SUPABASE_TOKEN)
        db.auth.onAuthStateChange((_, session) => {
            if (session) auth.value = session.user
        })
        if (!auth.value) setCookie('path', window.location.href)
        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    setCookie('auth', !!val)
                    window.location.replace(getCookie('path') ?? '/')
                    deleteCookie('path')
                }
            } else {
                deleteCookie('auth')
                window.location.reload()
            }
        })
        app.provide('db', db)
        app.provide(
            'auth',
            computed({
                get: () => auth.value,
                set: (val) => (auth.value = val),
            })
        )
    },
}
