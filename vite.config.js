import enums from './src/enums'
import process from 'node:process'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'
import { htmlPlugin } from './src/plugins/html.js'

export default defineConfig(() => {
    return {
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
    }
})
