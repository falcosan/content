import { ref, watch, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'
export default {
    install: (app) => {
        const auth = ref(false)
        const path = getCookie('path')
        const db = createClient(process.env.STORY_SUPABASE_URL, process.env.STORY_SUPABASE_TOKEN)
        if (process.env.NODE_ENV === 'development') {
            auth.value = getCookie('auth') === process.env.STORY_AUTH_SECRET
        } else {
            db.auth.onAuthStateChange((_, session) => {
                if (session) auth.value = true
            })
        }
        if (!auth.value) setCookie('path', window.location.href)
        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    setCookie('auth', val)
                    window.location.replace(path ?? '/')
                    deleteCookie('path')
                }
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
