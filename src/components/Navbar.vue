<script setup>
import { setCookie } from "@/utils/cookies.js";

const languages = ["en", "es", "it"];
const changeLanguage = (language) => setCookie("locale", language);
</script>

<template>
    <div class="container">
        <button
            v-for="(language, indexLanguage) in languages"
            :key="indexLanguage"
            @click="changeLanguage(language)"
            v-text="language"
        />
    </div>
</template>
