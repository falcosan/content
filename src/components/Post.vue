<script setup>
import enums from "@/enums";
import { Icon } from "@iconify/vue";
import { computed, inject } from "vue";
import Markdown from "@/components/Markdown";
import { reactive, toRefs, watch } from "vue";
import { editStoryblokStory, toggleStoryblokStory } from "@/api";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
const locale = inject("locale");
const state = reactive({
    post: {},
    loading: {
        edit: false,
        toggle: false,
    },
});
const { post, loading } = toRefs(state);
const fields = computed(() =>
    extractTranslatable(post.value.content).reduce((acc, value) => {
        const regex = new RegExp(`${enums.translatableSuffix}.*`);
        const key = value.replace(regex, "");
        const obj = enums.languages.reduce((objAcc, lang) => {
            const translatedKey = `${key}${enums.translatableSuffix}${lang}`;
            const text = lang === "en" ? key : translatedKey;
            return { ...objAcc, [lang]: text };
        }, {});
        return { ...acc, [key]: obj[locale.value] };
    }, {})
);
const mapPost = (values) => {
    const translatable = extractTranslatable(values.content).reduce(
        (acc, value) => {
            const regex = new RegExp(`${enums.translatableSuffix}.*`);
            const key = value.replace(regex, "");
            return enums.languages.reduce((objAcc, lang) => {
                const translatedKey = `${key}${enums.translatableSuffix}${lang}`;
                const text = lang === "en" ? key : translatedKey;
                return {
                    ...acc,
                    ...objAcc,
                    [text]: values.content[text] || "",
                };
            }, {});
        },
        {}
    );
    return { ...values, content: { ...values.content, ...translatable } };
};
const extractTranslatable = (source) =>
    Object.keys(source).filter((key) => key.includes(enums.translatableSuffix));
const editPost = async () => {
    loading.value.edit = true;
    await editStoryblokStory(post.value, locale.value)
        .then((res) => (post.value = mapPost(res.story)))
        .finally(() => (loading.value.edit = false));
};
const togglePost = async () => {
    loading.value.toggle = true;
    const state = post.value.published ? "unpublish" : "publish";
    await toggleStoryblokStory(post.value.id, state)
        .then((res) => (post.value = mapPost(res.story)))
        .finally(() => (loading.value.toggle = false));
};
watch(props.data, (val) => (post.value = mapPost(val)), { immediate: true });
</script>

<template>
    <div v-if="data.content">
        <Markdown v-model:text="post.content[fields.long_text]" />
        <div class="flex flex-wrap justify-center xs:justify-end mt-10 -m-2.5">
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-blue-500"
                @click="editPost"
            >
                <Icon
                    v-if="loading.edit"
                    class="text-2xl"
                    icon="eos-icons:three-dots-loading"
                />
                <span v-else v-text="'Save'" />
            </button>
            <button
                :class="[
                    'w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white',
                    post.published ? 'bg-red-500' : 'bg-green-600',
                ]"
                @click="togglePost"
            >
                <Icon
                    v-if="loading.toggle"
                    class="text-2xl"
                    icon="eos-icons:three-dots-loading"
                />
                <span
                    v-else
                    v-text="post.published ? 'Unpublish' : 'Publish'"
                />
            </button>
        </div>
    </div>
</template>
