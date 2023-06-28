<script setup>
defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
</script>

<template>
    <div class="container">{{ data }}</div>
</template>
