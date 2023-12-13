<script setup>
import Post from '@/components/Post'
import Note from '@/components/Note'
import Loader from '@/components/Loader'
import Teaser from '@/components/Teaser'
import { useRoute, useRouter } from 'vue-router'
import { getStoryblokStories, getStoryblokStory } from '@/api'
import { computed, inject, reactive, toRefs, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const auth = inject('auth')
const locale = inject('locale')
const loading = inject('loading')
const state = reactive({
    data: {
        note: [],
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
        case 'note':
            return Note
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
const getNote = async () => {
    const { stories: notes } = await getStoryblokStories(locale.value, 'note')
    data.value.note = notes.filter((story) => !story.is_startpage)
}
const getBlog = async () => {
    if (!!!view.value) loading.value = true
    const { stories: posts } = await getStoryblokStories(locale.value, 'blog')
    data.value.blog = posts
        .filter((story) => !story.is_startpage)
        .sort((a, b) => {
            const firstDate = new Date(a.content.date)
            const secondDate = new Date(b.content.date)
            return secondDate - firstDate
        })
    if (loading.value) loading.value = false
}
const getStories = async () => await Promise.all([getNote(), getBlog()])
const getStory = async () => {
    try {
        const { story } = await getStoryblokStory(route.query.id)
        setDetail(story)
    } catch {
        router.replace({ query: { type: 'error' } })
    }
}
watch(locale, getStories)
watch(
    () => route.query,
    async (val) => {
        if (val.id) {
            await getStory()
            if (!detail.value.state) detail.value.state = true
        } else {
            if (val.type) router.replace({ query: undefined })
            if (detail.value.state) detail.value.state = false
            await getStories()
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="py-5">
        <template v-if="!!view">
            <component :is="view" v-if="detail.state" :data="detail.item" />
            <Loader v-else position="full" />
        </template>
        <div v-else class="space-y-10">
            <h1
                v-if="auth.first_name"
                class="font-semibold text-gray-300"
                v-text="`Hello, ${auth.first_name} ${auth.last_name ?? ''}`"
            />
            <div class="relative">
                <h2 class="font-semibold text-gray-300" v-text="'Note'" />
                <div
                    class="grid grid-cols-12 sm:grid-cols-[repeat(auto-fit,_minmax(2rem,_1fr))] md:grid-cols-[repeat(auto-fit,_minmax(4rem,_1fr))] xl:grid-cols-12 auto-rows-fr gap-5"
                >
                    <Teaser
                        v-for="note in data.note"
                        :key="note.uuid"
                        class="col-span-12 sm:col-span-5 md:col-span-4 lg:col-span-3"
                        :data="note"
                        @click="setDetail(note)"
                    />
                </div>
            </div>
            <div class="relative">
                <h2 class="font-semibold text-gray-300" v-text="'Blog'" />
                <div
                    class="grid grid-cols-12 sm:grid-cols-[repeat(auto-fit,_minmax(2rem,_1fr))] md:grid-cols-[repeat(auto-fit,_minmax(4rem,_1fr))] xl:grid-cols-12 auto-rows-fr gap-5"
                >
                    <Teaser
                        v-for="post in data.blog"
                        :key="post.uuid"
                        class="col-span-12 sm:col-span-5 md:col-span-4 lg:col-span-3"
                        :data="post"
                        @click="setDetail(post)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
