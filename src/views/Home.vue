<script setup>
import Post from '@/components/Post'
import Loader from '@/components/Loader'
import Teaser from '@/components/Teaser'
import { useRoute, useRouter } from 'vue-router'
import { getStoryblokStories, getStoryblokStory } from '@/api'
import { computed, inject, reactive, toRefs, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const loading = inject('loading')
const state = reactive({
    data: {
        blog: [],
    },
    detail: {
        item: {},
        state: false,
    },
})
const { data, detail } = toRefs(state)
const view = computed(() => {
    switch (route.query.type) {
        case 'post':
            return Post
        default:
            return null
    }
})

const setDetail = (item) => {
    detail.value.item = item
    router.push({
        query: {
            ...route.query,
            id: item.id,
            type: item.content.component.toLowerCase(),
        },
    })
}

const setState = (state) => (detail.value.state = state)

const getBlog = async () => {
    const { stories: posts } = await getStoryblokStories('blog')
    data.value.blog = posts
        .filter((story) => !story.is_startpage)
        .sort((a, b) => new Date(b.content.date) - new Date(a.content.date))
}

const getStories = async () => {
    if (!view.value) loading.value = true
    await getBlog().finally(() => (loading.value = false))
}

const getStory = async () => {
    loading.value = true
    await getStoryblokStory(route.query.id)
        .then(({ story }) => setDetail(story))
        .catch(() => router.replace({ query: { type: 'error' } }))
        .finally(() => (loading.value = false))
}

watch(
    () => route.query,
    async (val) => {
        if (val.id) {
            await getStory()
        } else {
            if (val.type) router.replace({ query: undefined })
            setState(false)
            await getStories()
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="py-5">
        <template v-if="!!view">
            <component :is="view" v-show="detail.state" :data="detail.item" @ready="setState" />
            <Loader v-if="!detail.state" position="full" />
        </template>
        <div v-else class="space-y-10">
            <div v-if="data.blog.length" class="relative">
                <div class="grid grid-cols-12 auto-rows-fr gap-5">
                    <Teaser
                        v-for="post in data.blog"
                        :key="post.uuid"
                        class="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3"
                        :data="post"
                        @click="setDetail(post)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
