<script setup>
import enums from '@/enums'
import { Icon } from '@iconify/vue'
import Modal from '@/components/Modal'
import { useRoute, useRouter } from 'vue-router'
import { computed, inject, reactive, toRefs, onBeforeMount, onBeforeUnmount } from 'vue'

const db = inject('db')
const route = useRoute()
const router = useRouter()
const auth = inject('auth')
const locale = inject('locale')
const loading = inject('loading')
const state = reactive({
    modal: false,
    leave: false,
})
const { modal, leave } = toRefs(state)
const checkDetail = computed(() => !!route.query.type)
const toggleModal = (state) => (modal.value = state)
const signOut = async () => {
    loading.value = true
    await db.auth.signOut()
}
const goBack = () => {
    leave.value = true
    toggleModal(false)
    router.replace({ query: {} })
}
const changeLanguage = (language) => (locale.value = language)
const preventNav = (event) => {
    if (route.query.type) {
        if (leave.value) return
        event.preventDefault()
        event.returnValue = ''
    }
}
onBeforeMount(() => {
    window.addEventListener('beforeunload', preventNav)
    onBeforeUnmount(() => window.removeEventListener('beforeunload', preventNav))
})
router.beforeEach((to, from, next) => {
    if (to.query.type === 'error') {
        leave.value = true
        next(true)
        return
    } else if (!leave.value) {
        if (!!from.query.type) {
            toggleModal(true)
            next(false)
            return
        }
    } else if (to.query.type != null) leave.value = false
    next()
})
</script>

<template>
    <div class="sticky flex justify-between z-20 top-0 pb-5 -m-2 pointer-events-none">
        <div class="mx-2 shadow rounded-md transition-[padding] pointer-events-auto bg-white">
            <button
                v-for="(language, indexLanguage) in enums.languages"
                :key="indexLanguage"
                :class="[
                    'py-1.5 xx:py-2.5 px-3 xx:px-6 m-1 xx:m-2 rounded-md text-xs font-semibold uppercase',
                    locale === language ? 'text-gray-200 bg-gray-500' : 'text-gray-500 bg-gray-200',
                ]"
                @click="changeLanguage(language)"
                v-text="language"
            />
        </div>
        <div class="mx-2 shadow rounded-md transition-[padding] pointer-events-auto bg-white">
            <button
                class="py-1 xx:py-2 px-3 xx:px-5 m-1 xx:m-2 rounded-md text-gray-500 active:text-gray-200 bg-gray-200 active:bg-gray-500"
                @click="checkDetail ? toggleModal(true) : signOut()"
            >
                <Icon
                    class="text-xl"
                    :icon="checkDetail ? 'ic:round-home' : 'solar:logout-2-bold'"
                />
            </button>
        </div>
    </div>
    <Modal v-model:open="modal">
        <template #header>
            <p class="text-lg text-center font-bold text-gray-900" v-text="'Are you leaving ?'" />
        </template>
        <template #body>
            <div class="flex flex-wrap -m-2">
                <button
                    class="flex justify-center flex-auto py-2 px-5 m-2 rounded-md text-gray-200 active:bg-opacity-70 bg-red-500"
                    @click="toggleModal(false)"
                >
                    <Icon class="text-xl" icon="dashicons:no" />
                </button>
                <button
                    class="flex justify-center flex-auto py-2 px-5 m-2 rounded-md text-gray-200 active:bg-opacity-70 bg-green-500"
                    @click="goBack"
                >
                    <Icon class="text-xl" icon="dashicons:yes" />
                </button>
            </div>
        </template>
    </Modal>
</template>
