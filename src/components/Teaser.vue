<script setup>
defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
})
</script>

<template>
    <div v-if="data.content" class="w-full py-2 first:pt-0 last:pb-0 cursor-pointer">
        <div class="p-3 rounded bg-neutral-300">
            <p class="font-semibold text-gray-900">{{ data.content.title }}</p>
            <p class="text-gray-600 italic">{{ data.content.intro }}</p>
        </div>
    </div>
</template>
