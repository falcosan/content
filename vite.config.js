import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    envPrefix: "STORY_",
    resolve: {
        extensions: [".js", ".vue", ".json"],
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
