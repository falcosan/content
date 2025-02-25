<script setup>
import { inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import Loader from '@/components/Loader'
import Navbar from '@/components/Navbar'

const router = useRouter()
const logged = inject('logged')
const loading = inject('loading')

const checkAuth = (to) => {
    if (to.meta.requiresAuth && !logged?.value) {
        return { name: 'login' }
    }
    if (to.name === 'login' && logged?.value) {
        return { name: 'home' }
    }
    return true
}

router.beforeResolve(checkAuth)

watch(
    () => logged?.value,
    (isLogged) => {
        const currentRoute = router.currentRoute.value

        if (isLogged && currentRoute.name === 'login') {
            router.replace({ name: 'home' })
        } else if (!isLogged && currentRoute.meta.requiresAuth) {
            router.replace({ name: 'login' })
        }
    }
)
</script>

<template>
    <Loader v-if="loading" position="cover" />
    <Navbar v-if="logged" />
    <main>
        <RouterView v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <component :is="Component" />
            </transition>
        </RouterView>
    </main>
</template>
