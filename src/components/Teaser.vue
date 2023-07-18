<script setup>
defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
})
</script>

<template>
    <div
        v-if="data.content"
        class="relative h-full flex flex-col rounded-md overflow-hidden cursor-pointer"
    >
        <div
            class="w-full h-36 flex flex-col flex-auto space-y-2.5 p-5"
            :style="`background-color: ${
                data.content.background_color?.color || '#e0e0e0'
            }; color: ${data.content.text_color?.color || '#212121'};`"
        >
            <span v-if="data.content.title" class="teaser-title overflow-hidden text-lg sm:text-xl">
                {{ data.content.title }}
            </span>
            <span
                v-if="data.content.intro"
                class="teaser-intro overflow-hidden leading-relaxed text-sm"
            >
                {{ data.content.intro }}
            </span>
        </div>
        <slot
            name="loader"
            icon="text-8xl text-white"
            container="absolute h-full w-full flex items-center justify-center bg-opacity-50 bg-black"
        />
    </div>
</template>
<style scoped>
.teaser-title,
.teaser-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
</style>
