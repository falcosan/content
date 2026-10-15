import type { z } from 'zod'
import type { envSchema } from '../server/env'

export type Env = z.infer<typeof envSchema>
