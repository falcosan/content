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
            watch(
                auth,
                (val) => {
                    if (val) {
                        if (/login/.test(window.location.pathname)) {
                            setCookie('auth', val)
                            window.location.replace(path ?? '/')
                            deleteCookie('path')
                        }
                    } else {
                        setCookie('path', window.location.href)
                    }
                },
                { immediate: true }
            )
        } else {
            db.auth.onAuthStateChange((event, session) => {
                if (session) {
                    auth.value = true
                    if (/login/.test(window.location.pathname)) {
                        window.location.replace(path ?? '/')
                        deleteCookie('path')
                    }
                } else if (event === 'INITIAL_SESSION') {
                    setCookie('path', window.location.href)
                }
            })
        }

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
