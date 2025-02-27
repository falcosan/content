import enums from './src/enums'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { htmlPlugin } from './src/plugins/html.js'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
    return {
        plugins: [
            vue(),
            htmlPlugin(),
            tailwindcss(),
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
    }
})
