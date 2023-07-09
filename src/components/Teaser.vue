<script setup>
defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
</script>

<template>
    <div
        v-if="data.content"
        class="relative h-full flex flex-col rounded-md overflow-hidden cursor-pointer"
    >
        <div
            class="w-full flex flex-col flex-auto justify-between space-y-2.5 lg:space-y-px 2xl:space-y-0 p-5"
            :style="`background-color: ${
                data.content.background_color.color
                    ? data.content.background_color.color
                    : '#e0e0e0'
            }; color: ${data.content.text_color.color};`"
        >
            <div>
                <span
                    class="teaser-title mb-1 overflow-hidden text-lg sm:text-xl"
                >
                    {{ data.content.title }}
                </span>
                <span
                    class="teaser-intro h-12 mb-1.5 overflow-hidden leading-relaxed text-sm"
                >
                    {{ data.content.intro }}
                </span>
            </div>
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
