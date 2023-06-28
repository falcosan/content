import { computed, ref, watch } from "vue";
import { setCookie, getCookie } from "@/utils/cookies.js";

export default {
    install: (app) => {
        const locale = ref(getCookie("locale") ?? "en");
        watch(locale, () => setCookie("locale", locale.value), {
            immediate: true,
        });
        app.provide(
            "locale",
            computed({
                get: () => locale.value,
                set: (val) => (locale.value = val),
            })
        );
    },
};
