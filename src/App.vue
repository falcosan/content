<script setup>
import { inject } from 'vue';
import Navbar from '@/components/Navbar';
const auth = inject('auth');
</script>

<template>
    <Navbar v-if="auth" />
    <RouterView />
</template>
