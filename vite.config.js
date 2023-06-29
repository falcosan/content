import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import vue from "@vitejs/plugin-vue";
import { htmlPlugin } from "./src/plugins/html.js";

export default defineConfig({
    plugins: [vue(), htmlPlugin()],
    envPrefix: "STORY_",
    resolve: {
        extensions: [".js", ".vue", ".json"],
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
