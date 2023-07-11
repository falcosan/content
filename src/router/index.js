import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0 }
    },
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import(/* webpackChunkName: "login" */ '@/views/Login'),
        },
        {
            path: '/',
            name: 'home',
            meta: { requiresAuth: true },
            component: () => import(/* webpackChunkName: "home" */ '@/views/Home'),
        },
    ],
})
