<script setup>
import { useRouter } from 'vue-router'
import Loader from '@/components/Loader'
import { ref, inject, watch } from 'vue'
import Navbar from '@/components/Navbar'
const router = useRouter()
const logged = inject('logged')
const loading = inject('loading')
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
    <Loader v-if="loading" position="cover" />
    <Navbar v-if="logged" />
    <RouterView />
</template>
