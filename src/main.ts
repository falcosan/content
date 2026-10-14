import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { queryClient } from './api/queryClient'
import { router } from './router'
import './styles.css'

const app = createApp(App).use(router).use(VueQueryPlugin, { queryClient })

router.isReady().then(() => app.mount('#app'))
