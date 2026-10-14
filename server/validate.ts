import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import { z } from 'zod'

export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
    target: Target,
    schema: Schema
) =>
    zValidator(target, schema, (result, c) => {
        if (!result.success) return c.json({ error: z.prettifyError(result.error) }, 400)
    })

export const idParam = z.object({ id: z.coerce.number().int().positive() })

export const pageQuery = z.coerce.number().int().positive().default(1)

export const searchQuery = z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || undefined)
