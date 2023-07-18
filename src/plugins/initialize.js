import { computed, reactive, toRefs, watch } from 'vue'
import { setCookie, getCookie, deleteCookie } from '@/utils/cookies'

export default {
    install: (app) => {
        const state = reactive({
            locale: getCookie('locale') ?? 'en',
            auth: getCookie('auth') === import.meta.env.STORY_AUTH_SECRET,
        })
        const { locale, auth } = toRefs(state)
        if (!auth.value) setCookie('path', window.location.href)
        watch(
            locale,
            (val) => {
                setCookie('locale', val)
                document.documentElement.setAttribute('lang', val)
            },
            { immediate: true }
        )
        watch(auth, (val) => {
            if (val) {
                setCookie('auth', val)
                window.location.replace(getCookie('path'))
                deleteCookie('path')
            }
        })
        app.provide(
            'locale',
            computed({
                get: () => locale.value,
                set: (val) => (locale.value = val),
            })
        )
        app.provide(
            'auth',
            computed({
                get: () => auth.value,
                set: (val) => (auth.value = val),
            })
        )
    },
}
