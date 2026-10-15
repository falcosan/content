import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { FieldOption } from '#types/api'
import type { Storyblok } from '#types/storyblok'
import { BLOG } from '../../shared/blog'
import { MAX_LENGTH } from '../../shared/validation'
import { acceptsNewOptions, toFields } from '../dto'
import { validate } from '../validate'

const HIDDEN_FIELDS = new Set<string>(BLOG.hiddenFields)

const SEPARATOR = '; '

const names = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

const fieldParam = z.object({ key: z.string().min(1).max(100) })

const optionBody = z.object({
    name: z
        .string()
        .trim()
        .min(1)
        .max(MAX_LENGTH.optionName)
        .refine((name) => !name.includes(';'), 'Use a name without semicolons'),
})

const findPost = async (storyblok: Storyblok) => {
    const components = await storyblok.listComponents()
    const component = components.find(({ name }) => name === BLOG.component)
    if (!component) {
        throw new HTTPException(500, { message: `Component ${BLOG.component} not found` })
    }
    return component
}

const optionValue = (name: string, options: FieldOption[]) => {
    const lengths = new Set(options.map(({ value }) => value.split(SEPARATOR).length))
    const [length = 1] = lengths.size === 1 ? lengths : []
    const token = name.toLowerCase().replace(/\s+/g, '')
    return Array.from({ length }, () => token).join(SEPARATOR)
}

export const schemaRoutes = (storyblok: Storyblok) =>
    new Hono()
        .get('/fields', async (c) => {
            const component = await findPost(storyblok)
            return c.json(toFields(component).filter(({ key }) => !HIDDEN_FIELDS.has(key)))
        })
        .post(
            '/fields/:key/options',
            validate('param', fieldParam),
            validate('json', optionBody),
            async (c) => {
                const { key } = c.req.valid('param')
                const { name } = c.req.valid('json')
                const component = await findPost(storyblok)
                const field = component.schema[key]
                if (!field || HIDDEN_FIELDS.has(key) || !acceptsNewOptions(field)) {
                    throw new HTTPException(404, { message: 'Field not found' })
                }
                const options = field.options ?? []
                const value = optionValue(name, options)
                const existing = options.find(
                    (option) => names.compare(option.name, name) === 0 || option.value === value
                )
                if (existing) {
                    return c.json({
                        option: { name: existing.name, value: existing.value },
                        created: false,
                    })
                }
                const option = { _uid: crypto.randomUUID(), name, value }
                await storyblok.updateComponent(component.id, {
                    schema: {
                        ...component.schema,
                        [key]: {
                            ...field,
                            options: [...options, option].sort((a, b) =>
                                names.compare(a.name, b.name)
                            ),
                        },
                    },
                })
                return c.json({ option: { name, value }, created: true }, 201)
            }
        )
        .get('/languages', async (c) => {
            const space = await storyblok.getSpace()
            return c.json({
                defaultName: space.default_lang_name || 'Default',
                languages: (space.languages ?? []).flatMap(({ code, name }) =>
                    code ? [{ code, name: name || code }] : []
                ),
            })
        })
