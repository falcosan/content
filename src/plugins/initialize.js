import { ref, computed, watch } from 'vue'
import { setCookie, getCookie } from '@/utils/cookies'

export default {
    install: (app) => {
        const locale = ref(getCookie('locale') ?? 'en')
        watch(
            locale,
            (val) => {
                setCookie('locale', val)
                document.documentElement.setAttribute('lang', val)
            },
            { immediate: true }
        )
        app.provide(
            'locale',
            computed({
                get: () => locale.value,
                set: (val) => (locale.value = val),
            })
        )
    },
}
