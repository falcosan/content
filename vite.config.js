import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { htmlPlugin } from './src/plugins/html.js'

export default defineConfig(() => ({
    plugins: [
        vue(),
        htmlPlugin(),
        tailwindcss(),
    ],
    envPrefix: 'STORY_',
    resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
}))
