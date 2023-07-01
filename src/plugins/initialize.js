import { computed, reactive, toRefs, watch } from 'vue';
import { setCookie, getCookie } from '@/utils/cookies.js';

export default {
    install: (app) => {
        const state = reactive({
            locale: getCookie('locale') ?? 'en',
            auth: null,
        });
        const { locale, auth } = toRefs(state);
        watch(locale, () => setCookie('locale', locale.value), {
            immediate: true,
        });
        app.provide(
            'auth',
            computed({
                get: () => auth.value,
                set: (val) => (auth.value = val),
            })
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
