<script setup lang="ts">
import { ArrowLeft, CopyPlus, ExternalLink, EyeOff, History, Trash2 } from '@lucide/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useDebounceFn, useElementSize, useEventListener, useTitle } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import type { Field } from '#types/api'
import type { MenuItem } from '#types/app'
import type { StoryContent } from '#types/storyblok'
import { api, errorMessage, parseResponse, statusOf } from '@/api/client'
import { fieldsQuery, keys, storyQuery } from '@/api/queries'
import FieldControl from '@/components/fields/FieldControl.vue'
import FieldSkeleton from '@/components/fields/FieldSkeleton.vue'
import StoryDialog from '@/components/stories/StoryDialog.vue'
import VersionHistoryDialog from '@/components/stories/VersionHistoryDialog.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import { confirmAction } from '@/composables/useConfirm'
import { notify } from '@/composables/useToasts'
import { cloneDraft, draftTitle, snapshot, toDraft } from '@/lib/draft'
import { formatDate, formatRelative } from '@/lib/format'
import { APP_TITLE } from '@/lib/navigation'
import { validateContent } from '@/lib/validation'
import { BLOG } from '../../shared/blog'

const { id } = defineProps<{ id: number }>()

const HEAD_FIELDS = new Set<Field['type']>(['text', 'textarea'])

const BODY_FIELDS = new Set<Field['type']>(['markdown'])

const AUTOSAVE_DELAY_MS = 4000

const BAR =
    'bleed-border-b sticky top-header z-20 -mx-4 -mt-6 flex flex-wrap items-center gap-2 bg-bg/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6 lg:-mx-8 lg:px-8'
const BADGE_SLOT = 'flex items-center gap-2 max-sm:order-last max-sm:basis-full sm:gap-3'
const COLUMNS = 'grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]'
const MAIN = 'flex min-w-0 flex-col gap-6'
const SIDE = 'flex flex-col gap-6 lg:row-span-2'
const HEAD_SKELETON = [['h-9.5'], ['h-24']]
const BODY_SKELETON = [['h-115']]
const SIDE_SKELETON = [['aspect-video', 'h-9.5'], ['h-7', 'h-8'], ['h-9.5'], ['h-9.5']]

const queryClient = useQueryClient()
const router = useRouter()
const story = useQuery(computed(() => storyQuery(id)))
const fields = useQuery(fieldsQuery())

const save = useMutation({
    mutationFn: ({ value, publish }: { value: StoryContent; publish: boolean; auto?: boolean }) =>
        parseResponse(
            api.stories[':id'].$put({
                param: { id: String(id) },
                json: { content: { ...value, component: BLOG.component }, publish },
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

const draft = ref<StoryContent | null>(null)
const savedSnapshot = ref('')
const showErrors = ref(false)
const duplicating = ref(false)
const historyOpen = ref(false)
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
    if (!draft.value || !dirty.value || busy.value) return
    save.mutate({ value: cloneDraft(draft.value), publish: false, auto: true })
}, AUTOSAVE_DELAY_MS)

const current = computed(() => draft.value && snapshot(draft.value))
const dirty = computed(() => !!current.value && current.value !== savedSnapshot.value)

const headFields = computed(() => fields.data.value?.filter((f) => HEAD_FIELDS.has(f.type)))
const bodyFields = computed(() => fields.data.value?.filter((f) => BODY_FIELDS.has(f.type)))
const sideFields = computed(() =>
    fields.data.value?.filter((f) => !HEAD_FIELDS.has(f.type) && !BODY_FIELDS.has(f.type))
)

const loadError = computed(() => {
    if (story.isLoadingError.value) return story.error.value
    return fields.isLoadingError.value ? fields.error.value : null
})

const contentErrors = computed(() =>
    draft.value && fields.data.value ? validateContent(fields.data.value, draft.value) : {}
)
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
        ...(story.data.value && story.data.value.status !== 'published'
            ? [
                  {
                      label: 'Preview',
                      icon: ExternalLink,
                      href: router.resolve({
                          name: 'preview',
                          params: { token: story.data.value.previewToken },
                      }).href,
                  },
              ]
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

const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.stories })

const focusInvalid = async () => {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const reject = (message: string) => {
    showErrors.value = true
    notify(message, 'error')
    void focusInvalid()
}

const submit = (publish: boolean) => {
    if (!draft.value || busy.value) return
    if (publish && Object.keys(contentErrors.value).length) {
        return reject('Complete the required fields before publishing')
    }
    save.mutate({ value: cloneDraft(draft.value), publish })
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
                <FieldSkeleton v-for="(blocks, index) in HEAD_SKELETON" :key="index" :blocks />
            </div>
            <div :class="SIDE">
                <FieldSkeleton v-for="(blocks, index) in SIDE_SKELETON" :key="index" :blocks />
                <p class="text-xs"><span class="skeleton-text">Updated 2 years ago</span></p>
            </div>
            <div :class="MAIN">
                <FieldSkeleton v-for="(blocks, index) in BODY_SKELETON" :key="index" :blocks />
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
                <FieldControl
                    v-for="field in headFields"
                    :key="field.key"
                    v-model="draft[field.key]"
                    :field
                    :error="visibleErrors[field.key]"
                />
            </div>

            <aside :class="SIDE">
                <FieldControl
                    v-for="field in sideFields"
                    :key="field.key"
                    v-model="draft[field.key]"
                    :field
                    :error="visibleErrors[field.key]"
                />

                <p class="text-xs text-text-light">
                    Updated {{ formatRelative(story.data.value.updatedAt) }}
                    <template v-if="story.data.value.firstPublishedAt">
                        · First published {{ formatDate(story.data.value.firstPublishedAt) }}
                    </template>
                </p>
            </aside>

            <div :class="MAIN">
                <FieldControl
                    v-for="field in bodyFields"
                    :key="field.key"
                    v-model="draft[field.key]"
                    :field
                    :error="visibleErrors[field.key]"
                />
            </div>
        </div>

        <VersionHistoryDialog v-model:open="historyOpen" :story-id="id" :locked="dirty" />
        <StoryDialog v-model:open="duplicating" :source="{ id, title: draftTitle(draft) }" />
    </div>
</template>
