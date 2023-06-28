<script setup>
import { getStoryblok } from "@/api";
import Post from "@/components/Post.vue";
import Teaser from "@/components/Teaser.vue";
import { getCookie } from "@/utils/cookies.js";
import { useRoute, useRouter } from "vue-router";
import { reactive, toRefs, watch, computed } from "vue";

const route = useRoute();
const router = useRouter();
const state = reactive({
    data: [],
    detail: {
        state: false,
        item: {},
    },
});
const { data, detail } = toRefs(state);
const locale = computed(() => getCookie("locale"));
const setDetail = (item) => {
    detail.value.item = item;
    router.push({ query: { id: item.id } });
};
const getStories = async (language) => {
    const { stories } = await getStoryblok(language, "blog");
    data.value = stories.filter((story) => !story.is_startpage);
    return stories;
};
const getStory = async (language) => {
    const res = data.value.length ? data.value : await getStories(language);
    const item = res.find((item) => String(item.id) === String(route.query.id));
    if (item) {
        setDetail(item);
        router.push({ query: { id: item.id } });
    }
};
watch(
    () => route.query,
    async (val) => {
        if (!val.id) {
            if (!data.value.length) await getStories(locale.value);
            detail.value.state = false;
        } else {
            await getStory(locale.value).then(
                () => (detail.value.state = true)
            );
        }
    },
    { immediate: true }
);
</script>

<template>
    <div v-if="data.length" class="container mx-auto">
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
