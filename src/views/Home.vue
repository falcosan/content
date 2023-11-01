<script setup>
import Post from '@/components/Post'
import Loader from '@/components/Loader'
import Teaser from '@/components/Teaser'
import { useRoute, useRouter } from 'vue-router'
import { getStoryblokStories, getStoryblokStory } from '@/api'
import { computed, inject, reactive, toRefs, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const locale = inject('locale')
const state = reactive({
    data: [],
    loading: false,
    detail: {
        item: {},
        state: false,
    },
})
const { data, loading, detail } = toRefs(state)
const view = computed(() => {
    switch (route.query.type) {
        case 'post':
            return Post
        default:
            return null
    }
})
const setDetail = (item) => {
    const type = item.content.component.toLowerCase()
    detail.value.item = item
    router.push({
        query: {
            ...route.query,
            id: item.id,
            type,
        },
    })
}
const getStories = async (language) => {
    if (!data.value.length && !!!view.value) loading.value = true
    const { stories } = await getStoryblokStories(language, 'blog')
    if (loading.value) loading.value = false
    data.value = stories.filter((story) => !story.is_startpage)
}
const getStory = async () => {
    const index = data.value.findIndex((item) => String(item.id) === String(route.query.id))
    try {
        const { story } = await getStoryblokStory(route.query.id)
        setDetail(story)
    } catch {
        router.replace({ query: { type: 'error' } })
    }
}
watch(locale, async (val) => await getStories(val))
watch(
    () => route.query,
    async (val) => {
        if (val.id) {
            await getStory(locale.value)
            if (!detail.value.state) detail.value.state = true
        } else {
            if (val.type) router.replace({ query: undefined })
            if (detail.value.state) detail.value.state = false
            await getStories(locale.value)
        }
    },
    { immediate: true }
)
</script>

<template>
    <Loader v-if="loading" full />
    <div v-else class="py-5">
        <template v-if="!!view">
            <component :is="view" v-if="detail.state" :data="detail.item" />
            <Loader v-else full />
        </template>
        <template v-else>
            <h3 class="font-semibold text-gray-300" v-text="'Blog'" />
            <div
                class="grid grid-cols-12 sm:grid-cols-[repeat(auto-fit,_minmax(2rem,_1fr))] md:grid-cols-[repeat(auto-fit,_minmax(4rem,_1fr))] xl:grid-cols-12 auto-rows-fr gap-5"
            >
                <Teaser
                    v-for="post in data"
                    :key="post.uuid"
                    class="col-span-12 sm:col-span-5 md:col-span-4 lg:col-span-3"
                    :data="post"
                    @click="setDetail(post)"
                />
            </div>
        </template>
    </div>
</template>
