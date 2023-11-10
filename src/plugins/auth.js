import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'
export default {
    install: (app) => {
        const auth = ref(false)
        const url = import.meta.env.STORY_SUPABASE_URL
        const token = import.meta.env.STORY_SUPABASE_TOKEN
        const db = createClient(url, token)
        db.auth.onAuthStateChange((event, session) => {
            if (session) {
                auth.value = true
                if (/login/.test(window.location.pathname)) {
                    const path = getCookie('path')
                    if (path) {
                        window.location.replace(path)
                        deleteCookie('path')
                    }
                }
            } else if (event === 'INITIAL_SESSION') {
                setCookie('path', window.location.href)
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
