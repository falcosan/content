import { z } from 'zod'

const envSchema = z.object({
    STORY_ID_SPACE: z.coerce.number().int().positive(),
    STORY_OAUTH_TOKEN: z.string().min(1),
    STORY_AUTH_EMAIL: z.string().trim().min(1),
    STORY_AUTH_PASSWORD: z.string().regex(/^[a-f0-9]{64}$/i),
    STORY_DOMAIN_PRO: z.url(),
    STORY_API_URL: z.url().default('https://mapi.storyblok.com/v1'),
})

export type Env = z.infer<typeof envSchema>

export const readEnv = (source: Record<string, string | undefined>): Env => envSchema.parse(source)
