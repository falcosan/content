<script setup lang="ts">
import { ArrowLeft, CopyPlus, ExternalLink, EyeOff, History, Languages, Trash2 } from '@lucide/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useDebounceFn, useElementSize, useEventListener, useTitle } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import type { Field } from '#types/api'
import type { Draft, MenuItem } from '#types/app'
import { api, errorMessage, parseResponse, statusOf } from '@/api/client'
import { fieldsQuery, keys, languagesQuery, storyQuery } from '@/api/queries'
import FieldControl from '@/components/fields/FieldControl.vue'
import FieldSkeleton from '@/components/fields/FieldSkeleton.vue'
import StoryDialog from '@/components/stories/StoryDialog.vue'
import VersionHistoryDialog from '@/components/stories/VersionHistoryDialog.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiSegmentedControl from '@/components/ui/UiSegmentedControl.vue'
import { confirmAction } from '@/composables/useConfirm'
import { notify } from '@/composables/useToasts'
import { cloneDraft, draftTitle, snapshot, toDraft } from '@/lib/draft'
import { formatDate, formatRelative } from '@/lib/format'
import { APP_TITLE } from '@/lib/navigation'
import { isSlug } from '@/lib/slug'
import { validateContent } from '@/lib/validation'
import { BLOG } from '../../shared/blog'
import { MAX_LENGTH, SLUG_PATTERN } from '../../shared/validation'

const { id } = defineProps<{ id: number }>()

const MAIN_FIELDS = new Set<Field['type']>(['text', 'textarea', 'markdown'])

const AUTOSAVE_DELAY_MS = 4000

const BAR =
    'bleed-border-b sticky top-header z-20 -mx-4 -mt-6 flex flex-wrap items-center gap-2 bg-bg/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6 lg:-mx-8 lg:px-8'
const BADGE_SLOT = 'flex items-center gap-2 max-sm:order-last max-sm:basis-full sm:gap-3'
const COLUMNS = 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]'
const MAIN = 'flex min-w-0 flex-col gap-6'
const SIDE = 'flex flex-col gap-6'
const SETTINGS = 'flex flex-col gap-4 rounded-lg border border-border/40 p-4'
const MAIN_SKELETON = [['h-9.5'], ['h-24'], ['h-115']]
const SIDE_SKELETON = [['aspect-video', 'h-9.5'], ['h-7', 'h-8'], ['h-9.5'], ['h-9.5']]
const LANGUAGES_SKELETON = 'block h-9.5 w-48 rounded-md bg-text/10'

const queryClient = useQueryClient()
const router = useRouter()
const nameId = useId()
const slugId = useId()
const translateHintId = useId()
const story = useQuery(computed(() => storyQuery(id)))
const fields = useQuery(fieldsQuery())
const languages = useQuery(languagesQuery())

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

const destroy = useMutation({
    mutationFn: () => parseResponse(api.stories[':id'].$delete({ param: { id: String(id) } })),
    onSuccess: async () => {
        forgetChanges()
        queryClient.removeQueries({ queryKey: keys.story(id) })
        await invalidate()
        notify('Post deleted')
        await router.push({ name: 'stories' })
    },
})

const draft = ref<Draft | null>(null)
const savedSnapshot = ref('')
const showErrors = ref(false)
const duplicating = ref(false)
const historyOpen = ref(false)
const language = ref<string | null>(null)
const bar = useTemplateRef('bar')

const { height: barHeight } = useElementSize(bar, undefined, { box: 'border-box' })

useTitle(() => `${draftTitle(draft.value)} · ${APP_TITLE}`, { restoreOnUnmount: false })

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (dirty.value) event.preventDefault()
})

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty.value) submit(false)
    }
})

const autosave = useDebounceFn(() => {
    if (!draft.value || !dirty.value || !identityValid.value || busy.value) return
    save.mutate({ value: cloneDraft(draft.value), publish: false, auto: true })
}, AUTOSAVE_DELAY_MS)

const current = computed(() => draft.value && snapshot(draft.value))
const dirty = computed(() => !!current.value && current.value !== savedSnapshot.value)

const visibleFields = computed(() =>
    (fields.data.value ?? []).filter((field) => !language.value || field.translatable)
)
const mainFields = computed(() => visibleFields.value.filter((f) => MAIN_FIELDS.has(f.type)))
const sideFields = computed(() => visibleFields.value.filter((f) => !MAIN_FIELDS.has(f.type)))

const languageOptions = computed(() => {
    const data = languages.data.value
    if (!data?.languages.length) return []
    return [{ code: null, name: data.defaultName }, ...data.languages].map(({ code, name }) => ({
        value: code,
        label: name,
    }))
})

const languageName = computed(
    () => languages.data.value?.languages.find(({ code }) => code === language.value)?.name ?? ''
)

const loadError = computed(() => {
    if (story.isLoadingError.value) return story.error.value
    return fields.isLoadingError.value ? fields.error.value : null
})

const contentErrors = computed(() =>
    draft.value && fields.data.value ? validateContent(fields.data.value, draft.value.content) : {}
)
const nameValid = computed(() => !!draft.value?.name.trim())
const slugValid = computed(() => !!draft.value && isSlug(draft.value.slug))
const identityValid = computed(() => nameValid.value && slugValid.value)
const visibleErrors = computed(() => (showErrors.value ? contentErrors.value : {}))

const busy = computed(
    () => save.isPending.value || unpublish.isPending.value || destroy.isPending.value
)
const publishing = computed(() => save.isPending.value && save.variables.value?.publish === true)

const actions = computed<MenuItem[]>(() => {
    const published = story.data.value?.status === 'draft' ? undefined : story.data.value
    return [
        ...(published
            ? [{ label: 'View on website', icon: ExternalLink, href: published.url }]
            : []),
        { label: 'Version history', icon: History, run: () => (historyOpen.value = true) },
        {
            label: 'Duplicate',
            icon: CopyPlus,
            hint: dirty.value ? 'Save your changes before duplicating' : undefined,
            disabled: dirty.value || busy.value,
            run: () => (duplicating.value = true),
        },
        ...(published
            ? [
                  {
                      label: 'Unpublish',
                      icon: EyeOff,
                      disabled: busy.value,
                      loading: unpublish.isPending.value,
                      run: askUnpublish,
                  },
              ]
            : []),
        {
            label: 'Delete',
            icon: Trash2,
            disabled: busy.value,
            loading: destroy.isPending.value,
            run: askDelete,
        },
    ]
})

watch(
    () => story.data.value,
    (value) => {
        if (!value || dirty.value) return
        draft.value = toDraft(value)
        savedSnapshot.value = snapshot(draft.value)
    },
    { immediate: true }
)

watch(current, autosave)

onBeforeUnmount(autosave.cancel)

onBeforeRouteLeave(() => confirmDiscard())
onBeforeRouteUpdate(() => confirmDiscard())

const contentKey = (field: Field) =>
    language.value ? `${field.key}__i18n__${language.value}` : field.key

const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.stories })

const focusInvalid = async (id?: string) => {
    await nextTick()
    const target = id
        ? document.getElementById(id)
        : document.querySelector<HTMLElement>('[aria-invalid="true"]')
    target?.focus()
}

const reject = (message: string, id?: string) => {
    showErrors.value = true
    notify(message, 'error')
    void focusInvalid(id)
}

const submit = (publish: boolean) => {
    if (!draft.value || busy.value) return
    if (!nameValid.value) return reject('Add a story name first', nameId)
    if (!slugValid.value) return reject('Fix the slug first', slugId)
    if (publish && Object.keys(contentErrors.value).length) {
        language.value = null
        return reject('Complete the required fields before publishing')
    }
    save.mutate({ value: cloneDraft(draft.value), publish })
}

const askTranslate = async () => {
    if (!language.value) return
    const confirmed = await confirmAction({
        title: 'Translate with AI',
        message: `Translate the saved post into ${languageName.value}? Existing ${languageName.value} texts will be replaced.`,
        action: 'Translate',
    })
    if (confirmed) translate.mutate(language.value)
}

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
        message: `Delete “${draftTitle(draft.value)}”? This cannot be undone.`,
        action: 'Delete post',
    })
    if (confirmed) destroy.mutate()
}

const forgetChanges = () => (savedSnapshot.value = current.value ?? '')

const confirmDiscard = async () => {
    if (!dirty.value) return true
    autosave.cancel()
    const discard = await confirmAction({
        title: 'Discard changes?',
        message: 'You have unsaved changes that will be lost.',
        action: 'Discard changes',
    })
    if (discard) forgetChanges()
    else void autosave()
    return discard
}
</script>

<template>
    <section v-if="loadError" class="flex flex-col items-start gap-3 py-16" role="alert">
        <h1 class="text-2xl font-bold tracking-tight">
            {{ statusOf(loadError) === 404 ? 'Post not found' : 'Could not load the post' }}
        </h1>
        <p class="text-sm text-text-light">{{ errorMessage(loadError) }}</p>
        <RouterLink
            :to="{ name: 'stories' }"
            class="text-sm font-medium underline underline-offset-4"
        >
            Back to posts
        </RouterLink>
    </section>

    <div
        v-else-if="!draft || !story.data.value || !fields.data.value"
        class="flex animate-pulse flex-col gap-6"
        role="status"
        aria-busy="true"
        aria-label="Loading post"
    >
        <div :class="BAR">
            <span class="size-8 rounded-md bg-text/10" />
            <span :class="BADGE_SLOT"><span class="h-6 w-20 rounded-full bg-text/10" /></span>
            <span class="ml-auto h-8 w-40 rounded-md bg-text/10 sm:w-80" />
        </div>
        <div :class="COLUMNS">
            <div :class="MAIN">
                <span
                    v-if="languages.isPending.value || languageOptions.length"
                    :class="LANGUAGES_SKELETON"
                />
                <FieldSkeleton v-for="(blocks, index) in MAIN_SKELETON" :key="index" :blocks />
            </div>
            <div :class="SIDE">
                <div :class="SETTINGS">
                    <span class="text-xs"><span class="skeleton-text">Settings</span></span>
                    <FieldSkeleton :blocks="['h-9.5']" />
                    <FieldSkeleton :blocks="['h-9.5']" hint />
                </div>
                <FieldSkeleton v-for="(blocks, index) in SIDE_SKELETON" :key="index" :blocks />
                <p class="text-xs"><span class="skeleton-text">Updated 2 years ago</span></p>
            </div>
        </div>
    </div>

    <div
        v-else
        class="flex flex-col gap-6"
        :style="{ '--sticky-top': `calc(var(--spacing-header) + ${barHeight}px)` }"
    >
        <h1 class="sr-only">{{ draftTitle(draft) }}</h1>
        <div ref="bar" :class="BAR">
            <UiButton
                variant="ghost"
                size="sm"
                :icon="ArrowLeft"
                aria-label="Back to posts"
                title="Back to posts"
                @click="router.push({ name: 'stories' })"
            />
            <div :class="BADGE_SLOT">
                <StatusBadge :status="story.data.value.status" />
                <span class="text-xs text-text-light" aria-live="polite">
                    {{ save.isPending.value ? 'Saving…' : dirty ? 'Unsaved changes' : '' }}
                </span>
            </div>
            <div class="ml-auto flex items-center gap-2">
                <div class="flex items-center gap-2 max-sm:hidden">
                    <UiButton
                        v-for="action in actions"
                        :key="action.label"
                        variant="ghost"
                        size="sm"
                        :icon="action.icon"
                        :href="action.href"
                        :disabled="action.disabled"
                        :loading="action.loading"
                        :aria-label="action.label"
                        :title="action.hint ?? action.label"
                        @click="action.run?.()"
                    />
                </div>
                <div class="sm:hidden">
                    <UiMenu :items="actions" />
                </div>
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

        <div :class="COLUMNS">
            <div :class="MAIN">
                <span
                    v-if="languages.isPending.value"
                    :class="[LANGUAGES_SKELETON, 'animate-pulse']"
                    aria-hidden="true"
                />
                <div v-else-if="languageOptions.length" class="flex flex-wrap items-center gap-3">
                    <UiSegmentedControl
                        v-model="language"
                        :options="languageOptions"
                        label="Language"
                    />
                    <UiButton
                        v-if="language"
                        size="sm"
                        :icon="Languages"
                        :disabled="dirty || busy"
                        :loading="translate.isPending.value"
                        :aria-describedby="dirty ? translateHintId : undefined"
                        @click="askTranslate"
                    >
                        Translate with AI
                    </UiButton>
                    <p v-if="language" class="w-full text-xs text-text-light">
                        Editing the {{ languageName }} version. Only translatable fields are shown.
                        <span v-if="dirty" :id="translateHintId">
                            Save your changes before translating.
                        </span>
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

            <aside :class="SIDE">
                <section :class="SETTINGS">
                    <h2 class="text-xs font-semibold tracking-wide uppercase">Settings</h2>
                    <div>
                        <label class="label" :for="nameId">Story name</label>
                        <input
                            :id="nameId"
                            v-model="draft.name"
                            class="control"
                            required
                            :maxlength="MAX_LENGTH.storyName"
                            :aria-invalid="(showErrors && !nameValid) || undefined"
                        />
                    </div>
                    <div>
                        <label class="label" :for="slugId">Slug</label>
                        <input
                            :id="slugId"
                            v-model.trim="draft.slug"
                            class="control font-mono"
                            required
                            spellcheck="false"
                            :pattern="SLUG_PATTERN"
                            :maxlength="MAX_LENGTH.slug"
                            :aria-invalid="(showErrors && !slugValid) || undefined"
                        />
                        <p class="hint break-all">{{ BLOG.folder }}/{{ draft.slug || '…' }}</p>
                    </div>
                </section>

                <FieldControl
                    v-for="field in sideFields"
                    :key="contentKey(field)"
                    v-model="draft.content[contentKey(field)]"
                    :field
                    :error="language ? undefined : visibleErrors[field.key]"
                />

                <p class="text-xs text-text-light">
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
