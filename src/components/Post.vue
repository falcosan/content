<script setup>
import enums from "@/enums";
import { Icon } from "@iconify/vue";
import { computed, inject } from "vue";
import Editor from "@/components/Editor";
import { reactive, toRefs, watch } from "vue";
import {
    editStoryblokStory,
    toggleStoryblokStory,
    getStoryblokComponents,
} from "@/api";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
const locale = inject("locale");
const state = reactive({
    post: {},
    properties: {
        markdown: [],
        translatable: [],
    },
    loading: {
        edit: false,
        toggle: false,
    },
});
const { post, loading, properties } = toRefs(state);
const translatable = computed(() =>
    properties.value.translatable.reduce((acc, value) => {
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
const editors = computed(() => [
    {
        title: "Title",
        value: translatable.value.title,
        markdown: checkProperty("markdown", "title"),
    },
    {
        title: "Intro",
        value: translatable.value.intro,
        markdown: checkProperty("markdown", "intro"),
    },
    {
        title: "Content",
        value: translatable.value.long_text,
        markdown: checkProperty("markdown", "long_text"),
    },
]);
const mapPost = (values) => {
    const keys = properties.value.translatable.reduce((acc, value) => {
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
    }, {});
    return { ...values, content: { ...values.content, ...keys } };
};
const checkProperty = (prop, value) => properties.value[prop].includes(value);
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
watch(
    props.data,
    async (val) => {
        if (!properties.value.translatable.length) {
            const data = await getStoryblokComponents(val.content.component, [
                "translatable",
                { type: "markdown" },
            ]);
            properties.value.markdown = data.type;
            properties.value.translatable = data.translatable;
        }
        post.value = mapPost(val);
    },
    { immediate: true }
);
</script>

<template>
    <div v-if="post.content">
        <Editor
            v-for="(editor, indexEditor) in editors"
            :key="indexEditor"
            v-model:text="post.content[editor.value]"
            :title="editor.title"
            :tools="editor.markdown"
        />
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