import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import enums from './src/enums';
import { VitePWA } from 'vite-plugin-pwa';
import { htmlPlugin } from './src/plugins/html.js';

export default defineConfig({
    plugins: [
        vue(),
        htmlPlugin(),
        VitePWA({
            manifest: enums.manifest,
            registerType: 'autoUpdate',
        }),
    ],
    envPrefix: 'STORY_',
    resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
