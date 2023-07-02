import { computed, reactive, toRefs, watch } from 'vue';
import { setCookie, getCookie } from '@/utils/cookies.js';

export default {
    install: (app) => {
        const state = reactive({
            auth: getCookie('auth'),
            locale: getCookie('locale') ?? 'en',
        });
        const { locale, auth } = toRefs(state);
        watch(locale, (val) => setCookie('locale', val), {
            immediate: true,
        });
        app.provide(
            'auth',
            computed(() => auth.value)
        );
        app.provide(
            'locale',
            computed({
                get: () => locale.value,
                set: (val) => (locale.value = val),
            })
        );
    },
};
