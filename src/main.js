import './index.css'
import App from './App'
import { createApp } from 'vue'
import { router } from '@/router'
import auth from '@/plugins/auth'

const app = createApp(App)

app.use(auth)
app.use(router)

app.mount('#app')
