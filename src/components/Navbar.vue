<script setup>
import enums from "@/enums";
import { Icon } from "@iconify/vue";
import { computed, inject } from "vue";
import { useWindowScroll } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const { y } = useWindowScroll();
const locale = inject("locale");
const checkDetail = computed(() => !!route.query.type);
const goBack = () => router.replace({ query: {} });
const changeLanguage = (language) => (locale.value = language);
</script>

<template>
    <div class="relative z-10 pb-5" :style="`transform: translateY(${y}px)`">
        <div class="flex justify-between items-start -m-2">
            <div class="rounded pt-5 bg-white">
                <button
                    :class="[
                        'py-2.5 px-6 m-2 rounded text-xs font-semibold uppercase',
                        locale === language
                            ? 'text-white bg-gray-600'
                            : 'text-gray-600 bg-gray-200',
                    ]"
                    v-for="(language, indexLanguage) in enums.languages"
                    :key="indexLanguage"
                    v-text="language"
                    @click="changeLanguage(language)"
                />
            </div>
            <div class="rounded pt-5 bg-white">
                <button
                    v-if="checkDetail"
                    class="py-2 px-5 m-2 rounded text-gray-600 active:text-white bg-gray-200 active:bg-gray-600"
                    @click="goBack"
                >
                    <Icon class="text-xl" icon="ic:round-door-back" />
                </button>
            </div>
        </div>
    </div>
</template>
