<script setup>
import { ref, watch } from "vue";
import { putStoryblok } from "@/api";
import Markdown from "@/components/Markdown";

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
const post = ref({});
const editPost = async () => await putStoryblok(post.value);
watch(
    () => props.data,
    (val) => (post.value = val),
    { immediate: true }
);
</script>

<template>
    <div v-if="data.content">
        <Markdown v-model:text="post.content.long_text" />
        <button @click="editPost">button</button>
    </div>
</template>
