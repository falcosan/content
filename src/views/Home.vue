<script setup>
import { Icon } from '@iconify/vue'
import Post from '@/components/Post'
import Modal from '@/components/Modal'
import Loader from '@/components/Loader'
import Teaser from '@/components/Teaser'
import { useRoute, useRouter } from 'vue-router'
import { computed, inject, reactive, toRefs, watch } from 'vue'
import { getStoryblokStories, getStoryblokStory, createStoryblokStory } from '@/api'

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
    creating: false,
    showModal: false,
    newPostTitle: '',
})
const { data, detail, creating, showModal, newPostTitle } = toRefs(state)
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

const openCreateModal = () => {
    newPostTitle.value = ''
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    newPostTitle.value = ''
}

const createSlug = (title) =>
    title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')

const createNewPost = async () => {
    if (!newPostTitle.value.trim()) return

    creating.value = true
    const title = newPostTitle.value.trim()
    const slug = createSlug(title)

    await createStoryblokStory(title, slug)
        .then(({ story }) => {
            if (story) {
                closeModal()
                setDetail(story)
            }
        })
        .catch((error) => {
            console.error('Error creating post:', error)
        })
        .finally(() => (creating.value = false))
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
            <div class="flex mb-5">
                <button
                    class="flex items-center gap-2 py-2 px-4 rounded-md font-semibold text-gray-200 bg-neutral-600"
                    @click="openCreateModal"
                >
                    <Icon icon="mdi:plus" class="text-xl" />
                    <span v-text="'New Post'" />
                </button>
            </div>
            <div v-if="data.blog.length" class="relative">
                <div class="flex flex-col">
                    <Teaser
                        v-for="post in data.blog"
                        :key="post.uuid"
                        :data="post"
                        @click="setDetail(post)"
                    />
                </div>
            </div>
        </div>
        <Modal v-model:open="showModal">
            <template #body>
                <div class="space-y-4">
                    <div>
                        <input
                            type="text"
                            v-model="newPostTitle"
                            placeholder="Enter title"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            @keyup.enter="createNewPost"
                        />
                    </div>
                    <div class="flex justify-end gap-2">
                        <button
                            class="px-4 py-2 rounded-md font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400"
                            :disabled="creating"
                            @click="closeModal"
                        >
                            Cancel
                        </button>
                        <button
                            class="flex w-20 justify-center items-center gap-2 px-4 py-2 rounded-md font-semibold text-white bg-black hover:bg-gray-900 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="creating || !newPostTitle.trim()"
                            @click="createNewPost"
                        >
                            <Loader v-if="creating" size="2" />
                            <span v-else v-text="'Create'" />
                        </button>
                    </div>
                </div>
            </template>
        </Modal>
    </div>
</template>
