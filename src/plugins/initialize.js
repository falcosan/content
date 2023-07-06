import { computed, reactive, toRefs, watch } from 'vue';
import { setCookie, getCookie } from '@/utils/cookies.js';

export default {
    install: (app) => {
        const state = reactive({
            locale: getCookie('locale') ?? 'en',
            auth: getCookie('auth') === import.meta.env.STORY_AUTH_SECRET,
        });
        const { locale, auth } = toRefs(state);
        watch(
            locale,
            (val) => {
                setCookie('locale', val);
                document.documentElement.setAttribute('lang', val);
            },
            { immediate: true }
        );
        watch(auth, (val) => {
            if (val) {
                setCookie('auth', val);
                window.location.reload();
            }
        });
        app.provide(
            'locale',
            computed({
                get: () => locale.value,
                set: (val) => (locale.value = val),
            })
        );
        app.provide(
            'auth',
            computed({
                get: () => auth.value,
                set: (val) => (auth.value = val),
            })
        );
    },
};
