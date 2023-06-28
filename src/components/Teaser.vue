<script setup>
import { computed } from "vue";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({ content: {} }),
    },
});
const setFile = computed(() => {
    return (
        props.data.content?.file.filename ||
        "https://a.storyblok.com/f/106240/4065x1468/5c83c3e7de/noimeageteaser.png"
    );
});
</script>

<template>
    <RouterLink
        :to="{ name: 'post', params: { id: data.id } }"
        class="teaser-content h-full flex flex-col"
    >
        <div class="teaser-file-container w-full">
            <img
                class="teaser-file w-full h-full object-center select-none aspect-video"
                :src="setFile"
            />
        </div>
        <div
            class="teaser-text w-full flex flex-col flex-auto justify-between space-y-2.5 lg:space-y-px 2xl:space-y-0 p-5"
            :style="`background-color: ${
                data.content.background_color.color
                    ? data.content.background_color.color
                    : '#e0e0e0'
            }; color: ${data.content.text_color.color};`"
        >
            <div class="text-description">
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
    </RouterLink>
</template>
