<script setup>
import enums from '@/enums';
import { Icon } from '@iconify/vue';
import Modal from '@/components/Modal';
import { useWindowScroll } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import {
    computed,
    inject,
    reactive,
    toRefs,
    onBeforeMount,
    onBeforeUnmount,
} from 'vue';

const route = useRoute();
const router = useRouter();
const { y: scrollY } = useWindowScroll();
const locale = inject('locale');
const state = reactive({
    modal: false,
    leave: false,
});
const { modal, leave } = toRefs(state);
const checkDetail = computed(() => !!route.query.type);
const toggleModal = (state) => (modal.value = state);
const goBack = () => {
    leave.value = true;
    toggleModal(false);
    router.replace({ query: {} });
};
const changeLanguage = (language) => (locale.value = language);
const preventNav = (event) => {
    if (route.query.id) {
        if (leave.value) return;
        event.preventDefault();
        event.returnValue = '';
    }
};
onBeforeMount(() => {
    window.addEventListener('beforeunload', preventNav);
    onBeforeUnmount(() =>
        window.removeEventListener('beforeunload', preventNav)
    );
});
router.beforeEach((to, from, next) => {
    if (!leave.value) {
        if (from.query.id != null) {
            toggleModal(true);
            next(false);
            return;
        }
    } else if (to.query.id != null) leave.value = false;
    next();
});
</script>

<template>
    <div
        class="relative z-10 pb-5"
        :style="`transform: translateY(${scrollY}px)`"
    >
        <div class="flex justify-between items-start -m-2">
            <div
                :class="[
                    'rounded transition-[padding] bg-white',
                    scrollY ? 'pt-2.5' : 'pt-5',
                ]"
            >
                <button
                    v-for="(language, indexLanguage) in enums.languages"
                    :key="indexLanguage"
                    :class="[
                        'py-2.5 px-6 m-2 rounded text-xs font-semibold uppercase',
                        locale === language
                            ? 'text-white bg-gray-600'
                            : 'text-gray-600 bg-gray-200',
                    ]"
                    @click="changeLanguage(language)"
                    v-text="language"
                />
            </div>
            <div
                :class="[
                    'rounded transition-[padding] bg-white',
                    scrollY ? 'pt-2.5' : 'pt-5',
                ]"
            >
                <button
                    v-if="checkDetail"
                    class="py-2 px-5 m-2 rounded text-gray-600 active:text-white bg-gray-200 active:bg-gray-600"
                    @click="toggleModal(true)"
                >
                    <Icon class="text-xl" icon="ic:round-door-back" />
                </button>
            </div>
        </div>
    </div>
    <Modal v-model:open="modal">
        <template #header>
            <p
                class="text-lg text-center font-bold text-gray-600"
                v-text="'Are you leaving ?'"
            />
        </template>
        <template #body>
            <div class="flex flex-wrap -m-2">
                <button
                    class="flex justify-center flex-auto py-2 px-5 m-2 rounded text-white active:bg-opacity-70 bg-red-500"
                    @click="toggleModal(false)"
                >
                    <Icon class="text-xl" icon="dashicons:no" />
                </button>
                <button
                    class="flex justify-center flex-auto py-2 px-5 m-2 rounded text-white active:bg-opacity-70 bg-green-500"
                    @click="goBack"
                >
                    <Icon class="text-xl" icon="dashicons:yes" />
                </button>
            </div>
        </template>
    </Modal>
</template>
