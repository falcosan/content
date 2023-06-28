import { createRouter, createWebHistory } from "vue-router";
export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0 };
    },
    routes: [
        {
            path: "/",
            name: "home",
            component: () =>
                import(/* webpackChunkName: "home" */ "@/views/Home"),
        },
        {
            path: "/post/:id",
            name: "post",
            component: () =>
                import(/* webpackChunkName: "post" */ "@/components/Post"),
        },
    ],
});
