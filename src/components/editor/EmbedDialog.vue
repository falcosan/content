<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { useSession } from '@/composables/useSession'
import { toEmbedUrl } from '@/lib/embed'

const { editor } = defineProps<{ editor: Editor }>()

const open = defineModel<boolean>('open', { required: true })

const { data: session } = useSession()

const url = ref('')
const editing = ref(false)

const hosts = computed(() =>
    [session.value ? new URL(session.value.siteUrl).host : '', window.location.host].filter(Boolean)
)

const src = computed(() => toEmbedUrl(url.value, hosts.value))

watch(open, (isOpen) => {
    if (!isOpen) return
    editing.value = editor.isActive('embed')
    url.value = editing.value ? String(editor.getAttributes('embed').src ?? '') : ''
})

const save = () => {
    if (!src.value) return
    const chain = editor.chain().focus()
    if (editing.value) chain.updateAttributes('embed', { src: src.value }).run()
    else chain.setEmbed({ src: src.value }).run()
    open.value = false
}

const remove = () => {
    editor.chain().focus().deleteSelection().run()
    open.value = false
}
</script>

<template>
    <UiDialog v-model:open="open" :title="editing ? 'Edit embed' : 'Embed video'">
        <form id="embed-form" class="flex flex-col gap-4" @submit.prevent="save">
            <label class="block">
                <span class="label">Video URL</span>
                <input
                    v-model="url"
                    class="control"
                    inputmode="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    autofocus
                    :aria-invalid="(!!url && !src) || undefined"
                />
                <p class="hint">YouTube, Vimeo, Dailymotion, Twitch or any embeddable URL.</p>
            </label>
            <iframe
                v-if="src"
                :src
                title="Embed preview"
                class="aspect-video w-full rounded-md border border-ink/15"
                allow="encrypted-media; picture-in-picture"
                allowfullscreen
            />
        </form>
        <template #footer>
            <UiButton v-if="editing" class="mr-auto" @click="remove">Remove</UiButton>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton type="submit" form="embed-form" variant="solid" :disabled="!src">
                {{ editing ? 'Update' : 'Insert' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
