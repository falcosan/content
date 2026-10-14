import { createApp } from './app'
import { readEnv } from './env'

export const app = createApp(readEnv(process.env))

export default (request: Request) => app.fetch(request)
