<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { useTitle } from '@vueuse/core'
import { computed, watch } from 'vue'
import { errorMessage } from '@/api/client'
import { previewQuery } from '@/api/queries'
import { editorExtensions } from '@/components/editor/extensions'
import { isAssetValue } from '@/lib/assets'
import { toEditorHtml } from '@/lib/content'
import { draftTitle } from '@/lib/draft'
import { formatDate } from '@/lib/format'
import { APP_TITLE } from '@/lib/navigation'
import { BLOG } from '../../shared/blog'

const { token } = defineProps<{ token: string }>()

const story = useQuery(computed(() => previewQuery(token)))

const editor = useEditor({
    editable: false,
    extensions: editorExtensions({ onImages: () => undefined }),
    editorProps: { attributes: { class: 'prose-content' } },
})

const content = computed(() => story.data.value?.content ?? null)

const text = (key: string) => {
    const value = content.value?.[key]
    return typeof value === 'string' ? value : ''
}

const cover = computed(() => {
    const value = content.value?.[BLOG.fields.cover]
    return isAssetValue(value) && value.filename ? value : null
})

const body = computed(() => toEditorHtml(text(BLOG.fields.body)))

useTitle(() => `${draftTitle(content.value)} · Preview · ${APP_TITLE}`, {
    restoreOnUnmount: false,
})

watch([editor, body], ([current, html]) =>
    current?.commands.setContent(html, { emitUpdate: false })
)
</script>

<template>
    <p v-if="story.isError.value" class="py-16 text-sm text-text-light" role="alert">
        {{ errorMessage(story.error.value) }}
    </p>
    <article v-else-if="content" class="mx-auto flex max-w-3xl flex-col gap-6">
        <time v-if="text(BLOG.fields.date)" :datetime="text(BLOG.fields.date)" class="text-sm">
            {{ formatDate(text(BLOG.fields.date)) }}
        </time>
        <h1 class="text-4xl leading-tight font-bold">{{ draftTitle(content) }}</h1>
        <img
            v-if="cover"
            :src="cover.filename"
            :alt="cover.alt"
            class="aspect-video w-full rounded-md object-cover"
        />
        <p v-if="text(BLOG.fields.intro)" class="text-xl text-text-light">
            {{ text(BLOG.fields.intro) }}
        </p>
        <EditorContent :editor />
    </article>
    <div
        v-else
        class="fixed inset-0 grid place-items-center"
        role="status"
        aria-label="Loading preview"
    >
        <LoaderCircle class="size-6 animate-spin text-text-light" aria-hidden="true" />
    </div>
</template>
