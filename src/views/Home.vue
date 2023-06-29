<script setup>
import { getStoryblokStories, getStoryblokStory } from "@/api";
import Post from "@/components/Post.vue";
import Teaser from "@/components/Teaser.vue";
import { useRoute, useRouter } from "vue-router";
import { inject, reactive, toRefs, watch } from "vue";

const route = useRoute();
const router = useRouter();
const locale = inject("locale");
const state = reactive({
    data: [],
    detail: {
        state: false,
        item: {},
    },
});
const { data, detail } = toRefs(state);
const setDetail = (item) => {
    detail.value.item = item;
    router.push({ query: { id: item.id } });
};
const getStories = async (language) => {
    const { stories } = await getStoryblokStories(language, "blog");
    data.value = stories.filter((story) => !story.is_startpage);
};
const getStory = async () => {
    const { story } = await getStoryblokStory(route.query.id);
    setDetail(story);
};
watch(locale, async (val) => {
    if (!route.query) await getStories(val);
});
watch(
    () => route.query,
    async (val) => {
        if (val.id) {
            await getStory(locale.value);
            if (!detail.value.state) detail.value.state = true;
        } else {
            if (detail.value.state) detail.value.state = false;
        }
        if (!data.value.length) await getStories(locale.value);
    },
    { immediate: true }
);
</script>

<template>
    <div class="container mx-auto">
        <Post v-if="detail.state" :data="detail.item" />
        <template v-else>
            <Teaser
                v-for="post in data"
                :data="post"
                :key="post.uuid"
                @click="setDetail(post)"
            />
        </template>
    </div>
</template>
