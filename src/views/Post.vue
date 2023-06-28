<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import { getStoryblok, putStoryblok } from "@/api";
import Markdown from "@/components/Markdown";

const route = useRoute();
const data = ref({});
(async () => {
    const { story } = await getStoryblok(
        "en",
        null,
        `cdn/stories/${route.params.id}`
    );
    data.value = story;
})();
const editPost = async () => await putStoryblok(data.value, "it");
</script>
<template>
    <div v-if="data.content">
        <Markdown
            editable
            v-model:text="data.content.long_text"
            class="w-full sm:w-auto m-2.5 text-xl font-bold text-gray-dark"
        />
        <button @click="editPost">button</button>
    </div>
</template>
