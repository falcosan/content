import { setCookie } from "@/utils/cookies.js";

export default {
    install: () => {
        setCookie("locale", "en");
    },
};
