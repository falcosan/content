<script setup>
import { ref, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar'
const router = useRouter()
const auth = inject('auth')
const loaded = ref(false)
router.beforeEach((to, _, next) => {
    if (to.meta.requiresAuth && !auth.value) {
        next({ name: 'login' })
        return
    } else if (to.name === 'login' && auth.value) {
        next({ name: 'home' })
        return
    }
    next()
})
watch(
    auth,
    (val) => {
        if (val) setTimeout(() => (loaded.value = true), 200)
    },
    { immediate: true }
)
</script>

<template>
    <Navbar v-if="auth && loaded" />
    <RouterView />
</template>
