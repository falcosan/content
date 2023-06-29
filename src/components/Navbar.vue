<script setup>
import { inject } from "vue";

const locale = inject("locale");
const languages = ["en", "es", "it"];
const changeLanguage = (language) => (locale.value = language);
</script>

<template>
    <div>
        <button
            v-for="(language, indexLanguage) in languages"
            :key="indexLanguage"
            v-text="language"
            @click="changeLanguage(language)"
        />
    </div>
</template>
