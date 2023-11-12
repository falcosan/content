<script setup>
import { ref, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar'
const router = useRouter()
const logged = inject('logged')
router.beforeEach((to, _, next) => {
    if (to.meta.requiresAuth && !logged.value) {
        next({ name: 'login' })
        return
    } else if (to.name === 'login' && logged.value) {
        next({ name: 'home' })
        return
    }
    next()
})
</script>

<template>
    <Navbar v-if="logged" />
    <RouterView />
</template>
