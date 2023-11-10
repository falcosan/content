import { ref, watch, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'
export default {
    install: (app) => {
        const auth = ref(false)
        const db = createClient(process.env.STORY_SUPABASE_URL, process.env.STORY_SUPABASE_TOKEN)
        if (process.env.NODE_ENV === 'development') {
            auth.value = getCookie('auth') === process.env.STORY_AUTH_SECRET
            if (!auth.value) setCookie('path', window.location.href)
        } else {
            db.auth.onAuthStateChange((_, session) => {
                if (session) auth.value = true
                else setCookie('path', window.location.href)
            })
        }
        watch(auth, (val) => {
            if (val) {
                if (/login/.test(window.location.pathname)) {
                    if (process.env.NODE_ENV === 'development') setCookie('auth', val)
                    window.location.replace(getCookie('path'))
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
