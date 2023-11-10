import './index.css'
import App from './App'
import { createApp } from 'vue'
import { router } from '@/router'
import auth from '@/plugins/auth'
import initialize from '@/plugins/initialize'

const app = createApp(App)

app.use(auth)
app.use(router)
app.use(initialize)

app.mount('#app')
