import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { BLOG } from '../../shared/blog'
import { toFields, toWorkflowStage } from '../dto'
import type { Storyblok } from '../storyblok'

export const schemaRoutes = (storyblok: Storyblok) =>
    new Hono()
        .get('/fields', async (c) => {
            const components = await storyblok.listComponents()
            const component = components.find(({ name }) => name === BLOG.component)
            if (!component) {
                throw new HTTPException(500, { message: `Component ${BLOG.component} not found` })
            }
            return c.json(toFields(component))
        })
        .get('/workflow-stages', async (c) => {
            const [workflows, stages] = await Promise.all([
                storyblok.listWorkflows(),
                storyblok.listWorkflowStages(),
            ])
            const workflow =
                workflows.find(({ content_types }) => content_types.includes(BLOG.component)) ??
                workflows.find(({ is_default }) => is_default)
            return c.json(
                stages
                    .filter(({ workflow_id }) => workflow_id === workflow?.id)
                    .sort((a, b) => a.position - b.position)
                    .map(toWorkflowStage)
            )
        })
        .get('/languages', async (c) => {
            const space = await storyblok.getSpace()
            return c.json({
                defaultName: space.default_lang_name || 'Default',
                languages: (space.languages ?? []).map(({ code, name }) => ({ code, name })),
            })
        })
        .get('/tags', async (c) => {
            const tags = await storyblok.listTags()
            return c.json(tags.map(({ name }) => name).sort((a, b) => a.localeCompare(b)))
        })
