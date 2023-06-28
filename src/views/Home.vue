<script setup>
import { ref } from "vue";
import { getStoryblok } from "@/api";
import Teaser from "@/components/Teaser.vue";

const data = ref([]);
(async () => {
    const { stories } = await getStoryblok("en", "blog");
    data.value = stories.filter((story) => !story.is_startpage);
})();
</script>

<template>
    <div v-if="data.length" class="container mx-auto">
        <Teaser v-for="post in data" :data="post" :key="post.uuid" />
    </div>
</template>
