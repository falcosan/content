<script setup>
import { ref } from "vue";
import { getStoryblok, putStoryblok } from "@/api";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref({ content: {} });
(async () => {
    const { story } = await getStoryblok(
        "it",
        null,
        `cdn/stories/${route.params.id}`
    );
    data.value = story;
})();
const editPost = async () => await putStoryblok(data.value);
</script>
<template>
    <div>
        <textarea v-model="data.content.long_text" />
        <button @click="editPost">button</button>
    </div>
</template>
