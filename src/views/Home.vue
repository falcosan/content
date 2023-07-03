<script setup>
import { Icon } from '@iconify/vue';
import Post from '@/components/Post';
import Teaser from '@/components/Teaser';
import { useRoute, useRouter } from 'vue-router';
import { computed, inject, reactive, toRefs, watch } from 'vue';
import { getStoryblokStories, getStoryblokStory } from '@/api';

const route = useRoute();
const router = useRouter();
const locale = inject('locale');
const state = reactive({
    data: [],
    detail: {
        item: {},
        loading: [],
        state: false,
    },
});
const { data, detail } = toRefs(state);
const view = computed(() => {
    switch (route.query.type) {
        case 'post':
            return Post;
        default:
            return Post;
    }
});
const setDetail = (item) => {
    const type = item.content.component.toLowerCase();
    detail.value.item = item;
    router.push({
        query: {
            ...route.query,
            type,
            id: item.id,
        },
    });
};
const getStories = async (language) => {
    const { stories } = await getStoryblokStories(language, 'blog');
    data.value = stories.filter((story) => !story.is_startpage);
    detail.value.loading = Array.from(
        { length: data.value.length },
        () => false
    );
};
const getStory = async () => {
    const index = data.value.findIndex(
        (item) => String(item.id) === String(route.query.id)
    );
    detail.value.loading[index] = true;
    const { story } = await getStoryblokStory(route.query.id);
    setDetail(story);
    detail.value.loading[index] = false;
};
watch(locale, async (val) => {
    if (!route.query.id) await getStories(val);
});
watch(
    () => route.query,
    async (val) => {
        if (val.id) {
            await getStory(locale.value);
            if (!detail.value.state) detail.value.state = true;
        } else {
            if (val.type) router.replace({ query: undefined });
            if (detail.value.state) detail.value.state = false;
        }
        if (!data.value.length) await getStories(locale.value);
    },
    { immediate: true }
);
</script>

<template>
    <div class="pb-5 pt-8">
        <component :is="view" v-if="detail.state" :data="detail.item" />
        <div
            v-else
            class="grid grid-cols-12 sm:grid-cols-[repeat(auto-fit,_minmax(2rem,_1fr))] lg:grid-cols-12 gap-6"
        >
            <Teaser
                v-for="(post, indexPost) in data"
                :key="post.uuid"
                class="col-span-12 sm:col-span-5 md:col-span-4 lg:col-span-3"
                :data="post"
                @click="setDetail(post)"
            >
                <template #loader="{ container, icon }">
                    <transition
                        enter-from-class="opacity-0"
                        leave-to-class="opacity-0"
                        enter-active-class="transition"
                        leave-active-class="transition"
                    >
                        <div
                            v-if="detail.loading[indexPost]"
                            :class="container"
                        >
                            <Icon
                                :class="icon"
                                icon="eos-icons:three-dots-loading"
                            />
                        </div>
                    </transition>
                </template>
            </Teaser>
        </div>
    </div>
</template>
