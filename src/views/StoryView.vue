<script setup lang="ts">
import { ArrowLeft, CopyPlus, ExternalLink, History, Languages, Trash2 } from '@lucide/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useElementSize, useEventListener, useTitle, watchDebounced } from '@vueuse/core'
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import {
    api,
    errorMessage,
    parseResponse,
    statusOf,
    type Field,
    type Story,
    type StoryContent,
} from '@/api/client'
import { fieldsQuery, keys, languagesQuery, storyQuery, workflowStagesQuery } from '@/api/queries'
import FieldControl from '@/components/fields/FieldControl.vue'
import TagsInput from '@/components/fields/TagsInput.vue'
import StoryDialog from '@/components/stories/StoryDialog.vue'
import VersionHistoryDialog from '@/components/stories/VersionHistoryDialog.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { notify } from '@/composables/useToasts'
import { formatDate, formatRelative } from '@/lib/format'
import { APP_TITLE } from '@/lib/navigation'
import { isSlug, SLUG_PATTERN } from '@/lib/slug'
import { validateContent } from '@/lib/validation'
import { BLOG } from '../../shared/blog'

const { id } = defineProps<{ id: number }>()

interface Draft {
    name: string
    slug: string
    tags: string[]
    content: StoryContent
}

const MAIN_FIELDS = new Set<Field['type']>(['text', 'textarea', 'markdown'])

const AUTOSAVE_DELAY_MS = 4000

const queryClient = useQueryClient()
const router = useRouter()
const story = useQuery(computed(() => storyQuery(id)))
const fields = useQuery(fieldsQuery())
const stages = useQuery(workflowStagesQuery())
const languages = useQuery(languagesQuery())

const draft = ref<Draft | null>(null)
const savedSnapshot = ref('')
const showErrors = ref(false)
const duplicating = ref(false)
const historyOpen = ref(false)
const language = ref<string | null>(null)
const leaving = ref(false)
const slugId = useId()
const stageFieldId = useId()
const tagsId = useId()

const snapshot = (value: Draft) => JSON.stringify(value)

const toDraft = (value: Story): Draft => ({
    name: value.name,
    slug: value.slug,
    tags: [...value.tags],
    content: JSON.parse(JSON.stringify(value.content)) as StoryContent,
})

const dirty = computed(() => !!draft.value && snapshot(draft.value) !== savedSnapshot.value)

watch(
    () => story.data.value,
    (value) => {
        if (!value || (draft.value && dirty.value)) return
        draft.value = toDraft(value)
        savedSnapshot.value = snapshot(draft.value)
    },
    { immediate: true }
)

const visibleFields = computed(() =>
    (fields.data.value ?? []).filter((field) => !language.value || field.translatable)
)
const mainFields = computed(() => visibleFields.value.filter((f) => MAIN_FIELDS.has(f.type)))
const sideFields = computed(() => visibleFields.value.filter((f) => !MAIN_FIELDS.has(f.type)))

const contentKey = (field: Field) =>
    language.value ? `${field.key}__i18n__${language.value}` : field.key

const languageOptions = computed(() => {
    const data = languages.data.value
    return data?.languages.length ? [{ code: null, name: data.defaultName }, ...data.languages] : []
})

const languageName = computed(
    () => languages.data.value?.languages.find(({ code }) => code === language.value)?.name ?? ''
)

const contentErrors = computed(() =>
    draft.value && fields.data.value ? validateContent(fields.data.value, draft.value.content) : {}
)
const slugValid = computed(() => !!draft.value && isSlug(draft.value.slug))
const visibleErrors = computed(() => (showErrors.value ? contentErrors.value : {}))

const title = computed(() => {
    const value = draft.value?.content[BLOG.fields.title]
    return typeof value === 'string' && value.trim() ? value : (draft.value?.name ?? 'Post')
})

useTitle(computed(() => `${title.value} · ${APP_TITLE}`))

const bar = useTemplateRef('bar')
const { height: barHeight } = useElementSize(bar, undefined, { box: 'border-box' })

const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.stories })

const save = useMutation({
    mutationFn: ({ value, publish }: { value: Draft; publish: boolean; auto?: boolean }) =>
        parseResponse(
            api.stories[':id'].$put({
                param: { id: String(id) },
                json: {
                    ...value,
                    content: { ...value.content, component: BLOG.component },
                    publish,
                },
            })
        ),
    onSuccess: (updated, { value, publish, auto }) => {
        savedSnapshot.value = snapshot(value)
        queryClient.setQueryData(keys.story(id), updated)
        void invalidate()
        if (!auto) notify(publish ? 'Post published' : 'Changes saved')
    },
})

const unpublish = useMutation({
    mutationFn: () =>
        parseResponse(api.stories[':id'].unpublish.$post({ param: { id: String(id) } })),
    onSuccess: async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: keys.story(id) }),
            invalidate(),
        ])
        notify('Post unpublished')
    },
})

const translate = useMutation({
    mutationFn: (code: string) =>
        parseResponse(
            api.stories[':id'].translate.$post({
                param: { id: String(id) },
                json: { language: code },
            })
        ),
    onSuccess: ({ content }) => {
        if (!draft.value) return
        Object.assign(draft.value.content, content)
        notify('Translation added. Review it and save.')
    },
})

const askTranslate = async () => {
    if (!language.value) return
    const confirmed = await confirmAction({
        title: 'Translate with AI',
        message: `Translate the saved post into ${languageName.value}? Existing ${languageName.value} texts will be replaced.`,
        action: 'Translate',
    })
    if (confirmed) translate.mutate(language.value)
}

const changeStage = useMutation({
    mutationFn: (stage: number) =>
        parseResponse(
            api.stories[':id'].stage.$post({ param: { id: String(id) }, json: { stageId: stage } })
        ),
    onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: keys.story(id) })
        notify('Workflow stage updated')
    },
})

const stage = computed({
    get: () => story.data.value?.stageId ?? null,
    set: (value: number | null) => {
        if (value !== null) changeStage.mutate(value)
    },
})

const destroy = useMutation({
    mutationFn: () => parseResponse(api.stories[':id'].$delete({ param: { id: String(id) } })),
    onSuccess: async () => {
        leaving.value = true
        queryClient.removeQueries({ queryKey: keys.story(id) })
        await invalidate()
        notify('Post deleted')
        await router.push({ name: 'stories' })
    },
})

const busy = computed(
    () => save.isPending.value || unpublish.isPending.value || destroy.isPending.value
)
const publishing = computed(() => save.isPending.value && save.variables.value?.publish === true)

const focusFirstError = async () => {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const submit = (publish: boolean) => {
    if (!draft.value || busy.value) return
    const blocking = publish && Object.keys(contentErrors.value).length > 0
    if (!slugValid.value || blocking) {
        showErrors.value = true
        notify(
            slugValid.value
                ? 'Complete the required fields before publishing'
                : 'Fix the slug first',
            'error'
        )
        void focusFirstError()
        return
    }
    save.mutate({ value: JSON.parse(snapshot(draft.value)) as Draft, publish })
}

watchDebounced(
    () => draft.value && snapshot(draft.value),
    () => {
        if (!draft.value || !dirty.value || !slugValid.value || busy.value) return
        save.mutate({
            value: JSON.parse(snapshot(draft.value)) as Draft,
            publish: false,
            auto: true,
        })
    },
    { debounce: AUTOSAVE_DELAY_MS }
)

const askUnpublish = async () => {
    const confirmed = await confirmAction({
        title: 'Unpublish post',
        message: 'The post will no longer be visible on the website.',
        action: 'Unpublish',
    })
    if (confirmed) unpublish.mutate()
}

const askDelete = async () => {
    const confirmed = await confirmAction({
        title: 'Delete post',
        message: `Delete “${title.value}”? This cannot be undone.`,
        action: 'Delete post',
    })
    if (confirmed) destroy.mutate()
}

const confirmDiscard = () =>
    !dirty.value ||
    leaving.value ||
    confirmAction({
        title: 'Discard changes?',
        message: 'You have unsaved changes that will be lost.',
        action: 'Discard changes',
    })

onBeforeRouteLeave(confirmDiscard)
onBeforeRouteUpdate(confirmDiscard)

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (dirty.value) event.preventDefault()
})

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        submit(false)
    }
})
</script>

<template>
    <section v-if="story.isError.value" class="flex flex-col items-start gap-3 py-16" role="alert">
        <h1 class="text-2xl font-bold tracking-tight">
            {{ statusOf(story.error.value) === 404 ? 'Post not found' : 'Could not load the post' }}
        </h1>
        <p class="text-sm text-ink/60">{{ errorMessage(story.error.value) }}</p>
        <RouterLink
            :to="{ name: 'stories' }"
            class="text-sm font-medium underline underline-offset-4"
        >
            Back to posts
        </RouterLink>
    </section>

    <div
        v-else-if="!draft || !story.data.value || !fields.data.value"
        class="flex flex-col gap-6"
        aria-busy="true"
    >
        <div class="h-10 w-1/3 animate-pulse rounded bg-ink/10" />
        <div class="h-96 animate-pulse rounded-md bg-ink/10" />
    </div>

    <div
        v-else
        class="flex flex-col gap-6"
        :style="{ '--sticky-top': `calc(3.5rem + ${barHeight}px)` }"
    >
        <div
            ref="bar"
            class="sticky top-14 z-20 -mx-4 -mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink/15 bg-paper/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
            <UiButton
                variant="ghost"
                size="sm"
                :icon="ArrowLeft"
                aria-label="Back to posts"
                title="Back to posts"
                @click="router.push({ name: 'stories' })"
            />
            <StatusBadge :status="story.data.value.status" />
            <span class="text-xs text-ink/60" aria-live="polite">
                {{ save.isPending.value ? 'Saving…' : dirty ? 'Unsaved changes' : '' }}
            </span>
            <div class="ml-auto flex flex-wrap items-center gap-2">
                <UiButton
                    v-if="story.data.value.status !== 'draft'"
                    variant="ghost"
                    size="sm"
                    :icon="ExternalLink"
                    :href="story.data.value.url"
                    aria-label="View on website"
                    title="View on website"
                />
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="History"
                    aria-label="Version history"
                    title="Version history"
                    @click="historyOpen = true"
                />
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="CopyPlus"
                    :disabled="dirty || busy"
                    aria-label="Duplicate"
                    :title="dirty ? 'Save your changes before duplicating' : 'Duplicate'"
                    @click="duplicating = true"
                />
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="Trash2"
                    :disabled="busy"
                    :loading="destroy.isPending.value"
                    aria-label="Delete"
                    title="Delete"
                    @click="askDelete"
                />
                <UiButton
                    v-if="story.data.value.status !== 'draft'"
                    size="sm"
                    :disabled="busy"
                    :loading="unpublish.isPending.value"
                    @click="askUnpublish"
                >
                    Unpublish
                </UiButton>
                <UiButton
                    size="sm"
                    :disabled="busy || !dirty"
                    :loading="save.isPending.value && !publishing"
                    title="Save (⌘S)"
                    @click="submit(false)"
                >
                    Save
                </UiButton>
                <UiButton
                    variant="solid"
                    size="sm"
                    :disabled="busy || (story.data.value.status === 'published' && !dirty)"
                    :loading="publishing"
                    @click="submit(true)"
                >
                    Publish
                </UiButton>
            </div>
        </div>

        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="flex min-w-0 flex-col gap-6">
                <div v-if="languageOptions.length" class="flex flex-wrap items-center gap-3">
                    <div
                        role="radiogroup"
                        aria-label="Language"
                        class="flex rounded-md border border-ink/25 p-0.5"
                    >
                        <label
                            v-for="option in languageOptions"
                            :key="option.code ?? 'default'"
                            class="cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-ink"
                        >
                            <input
                                v-model="language"
                                type="radio"
                                class="sr-only"
                                :value="option.code"
                            />
                            {{ option.name }}
                        </label>
                    </div>
                    <UiButton
                        v-if="language"
                        size="sm"
                        :icon="Languages"
                        :disabled="dirty || busy"
                        :loading="translate.isPending.value"
                        :title="dirty ? 'Save your changes before translating' : undefined"
                        @click="askTranslate"
                    >
                        Translate with AI
                    </UiButton>
                    <p v-if="language" class="w-full text-xs text-ink/60">
                        Editing the {{ languageName }} version. Only translatable fields are shown.
                    </p>
                </div>
                <FieldControl
                    v-for="field in mainFields"
                    :key="contentKey(field)"
                    v-model="draft.content[contentKey(field)]"
                    :field
                    :error="language ? undefined : visibleErrors[field.key]"
                />
            </div>

            <aside class="flex flex-col gap-6">
                <section class="flex flex-col gap-4 rounded-lg border border-ink/15 p-4">
                    <h2 class="text-xs font-semibold tracking-wide uppercase">Settings</h2>
                    <label class="block">
                        <span class="label">Story name</span>
                        <input v-model="draft.name" class="control" required maxlength="255" />
                    </label>
                    <div>
                        <label class="label" :for="slugId">Slug</label>
                        <input
                            :id="slugId"
                            v-model.trim="draft.slug"
                            class="control font-mono"
                            required
                            spellcheck="false"
                            :pattern="SLUG_PATTERN"
                            :aria-invalid="(showErrors && !slugValid) || undefined"
                        />
                        <p class="hint break-all">{{ BLOG.folder }}/{{ draft.slug || '…' }}</p>
                    </div>
                    <div>
                        <label class="label" :for="tagsId">Tags</label>
                        <TagsInput v-model="draft.tags" :input-id="tagsId" />
                    </div>
                    <div v-if="stages.data.value?.length">
                        <label class="label" :for="stageFieldId">Workflow stage</label>
                        <select
                            :id="stageFieldId"
                            v-model="stage"
                            class="control"
                            :disabled="changeStage.isPending.value"
                        >
                            <option :value="null" disabled>Not set</option>
                            <option
                                v-for="option in stages.data.value"
                                :key="option.id"
                                :value="option.id"
                            >
                                {{ option.name }}
                            </option>
                        </select>
                    </div>
                </section>

                <FieldControl
                    v-for="field in sideFields"
                    :key="contentKey(field)"
                    v-model="draft.content[contentKey(field)]"
                    :field
                    :error="language ? undefined : visibleErrors[field.key]"
                />

                <p class="text-xs text-ink/60">
                    Updated {{ formatRelative(story.data.value.updatedAt) }}
                    <template v-if="story.data.value.firstPublishedAt">
                        · First published {{ formatDate(story.data.value.firstPublishedAt) }}
                    </template>
                </p>
            </aside>
        </div>

        <VersionHistoryDialog v-model:open="historyOpen" :story-id="id" :locked="dirty" />
        <StoryDialog
            v-model:open="duplicating"
            :source="{ id, name: draft.name, slug: draft.slug }"
        />
    </div>
</template>
