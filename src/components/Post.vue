<script setup>
import enums from "@/enums";
import { ref, watch } from "vue";
import { putStoryblok } from "@/api";
import { computed, inject } from "vue";
import Markdown from "@/components/Markdown";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
const locale = inject("locale");
const post = ref({});
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
const editPost = async () => await putStoryblok(post.value, locale.value);
watch(props.data, (val) => (post.value = mapPost(val)), { immediate: true });
</script>

<template>
    <div v-if="data.content">
        <Markdown v-model:text="post.content[fields.long_text]" />
        <button @click="editPost">button</button>
    </div>
</template>
