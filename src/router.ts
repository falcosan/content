import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { api, errorMessage, parseResponse } from './api/client'
import { sessionQuery } from './api/queries'
import { queryClient } from './api/queryClient'
import { notify } from './composables/useToasts'
import { APP_TITLE, safeRedirect } from './lib/navigation'
import StoriesView from './views/StoriesView.vue'

const legacyStoryRedirect = (to: RouteLocationNormalized) => {
    const { id } = to.query
    return typeof id === 'string' && /^\d+$/.test(id)
        ? { name: 'story', params: { id }, query: {}, replace: true }
        : true
}

const signOut = () =>
    parseResponse(api.session.$delete()).then(
        () => {
            queryClient.clear()
            return { name: 'login' }
        },
        (error: unknown) => {
            notify(errorMessage(error), 'error')
            return false
        }
    )

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('./views/LoginView.vue'),
            meta: { public: true, title: 'Sign in' },
        },
        {
            path: '/logout',
            name: 'logout',
            component: () => import('./views/LoginView.vue'),
            beforeEnter: signOut,
            meta: { public: true },
        },
        {
            path: '/',
            name: 'stories',
            component: StoriesView,
            beforeEnter: legacyStoryRedirect,
            meta: { title: 'Posts' },
        },
        {
            path: '/stories/:id(\\d+)',
            name: 'story',
            component: () => import('./views/StoryView.vue'),
            props: (route) => ({ id: Number(route.params.id) }),
        },
        {
            path: '/media',
            name: 'media',
            component: () => import('./views/MediaView.vue'),
            meta: { title: 'Media' },
        },
        {
            path: '/:path(.*)*',
            name: 'not-found',
            component: () => import('./views/NotFoundView.vue'),
            meta: { title: 'Not found' },
        },
    ],
})

router.beforeEach(async (to) => {
    const session = await queryClient.ensureQueryData(sessionQuery()).catch(() => null)
    if (to.name === 'login') return session ? safeRedirect(to.query.redirect) : true
    if (to.meta.public || session) return true
    return { name: 'login', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · ${APP_TITLE}` : APP_TITLE
})
