<script setup>
import { computed } from "vue";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
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
    <div
        v-if="data.content"
        class="teaser-content relative h-full flex flex-col rounded-md overflow-hidden cursor-pointer"
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
        <slot
            name="loader"
            icon="text-8xl text-white"
            container="absolute h-full w-full flex items-center justify-center bg-opacity-50 bg-black"
        />
    </div>
</template>
<style scoped>
@supports not (aspect-ratio: 1 / 1) {
    .post-teaser {
        @apply lg:h-[212px] xl:h-[184px] 2xl:h-[182px];
    }
    .teaser-file-container {
        @apply relative md:h-[calc(50%-20px)] lg:h-full flex-none lg:flex-auto;
    }
    .teaser-file-container::before {
        content: "";
        @apply float-left pt-[calc((9_/_16)_*_100%)];
    }
    .teaser-file-container.container-mode::before {
        @apply md:pt-[calc((10_/_16)_*_100%)] lg:pt-[calc((4_/_14)_*_100%)] xl:pt-[calc((3_/_14)_*_100%)] 2xl:pt-[calc((2_/_11)_*_100%)];
    }
    .teaser-file-container::after {
        content: "";
        @apply block clear-both;
    }
}
.teaser-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
.teaser-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
</style>
