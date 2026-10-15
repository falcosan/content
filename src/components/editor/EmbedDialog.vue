<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { computed, ref, useId, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { useSession } from '@/composables/useSession'
import { toEmbedUrl } from '@/lib/embed'

const { editor } = defineProps<{ editor: Editor }>()

const open = defineModel<boolean>('open', { required: true })

const formId = useId()
const urlId = useId()
const hintId = useId()
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
        <form :id="formId" class="flex flex-col gap-4" @submit.prevent="save">
            <div>
                <label class="label" :for="urlId">Video URL</label>
                <input
                    :id="urlId"
                    v-model="url"
                    class="control"
                    inputmode="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    autofocus
                    :aria-invalid="(!!url && !src) || undefined"
                    :aria-describedby="hintId"
                />
                <p :id="hintId" class="hint">
                    YouTube, Vimeo, Dailymotion, Twitch or any embeddable URL.
                </p>
            </div>
            <iframe
                v-if="src"
                :src
                title="Embed preview"
                class="aspect-video w-full rounded-md border border-border/40"
                allow="encrypted-media; picture-in-picture"
                allowfullscreen
            />
        </form>
        <template #footer>
            <UiButton v-if="editing" class="mr-auto" @click="remove">Remove video</UiButton>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton type="submit" :form="formId" variant="solid" :disabled="!src">
                {{ editing ? 'Update' : 'Insert' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
