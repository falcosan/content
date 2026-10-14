<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, parseResponse } from '@/api/client'
import { fieldsQuery, keys } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { notify } from '@/composables/useToasts'
import { isSlug, SLUG_PATTERN, slugify } from '@/lib/slug'
import { BLOG } from '../../../shared/blog'

const { source } = defineProps<{
    source?: { id: number; name: string; slug: string }
}>()

const open = defineModel<boolean>('open', { required: true })

const queryClient = useQueryClient()
const router = useRouter()
const { data: fields } = useQuery(fieldsQuery())

const name = ref('')
const slug = ref('')
const slugEdited = ref(false)

const titleLimit = computed(() => {
    const title = fields.value?.find((field) => field.key === BLOG.fields.title)
    return title && 'maxLength' in title ? (title.maxLength ?? undefined) : undefined
})

const valid = computed(() => !!name.value.trim() && isSlug(slug.value))

watch(open, (isOpen) => {
    if (!isOpen) return
    name.value = source ? `${source.name} (copy)` : ''
    slug.value = source ? `${source.slug}-copy` : ''
    slugEdited.value = !!source
})

watch(name, (value) => {
    if (!slugEdited.value) slug.value = slugify(value)
})

const editSlug = (value: string) => {
    slugEdited.value = true
    slug.value = value
}

const save = useMutation({
    mutationFn: (json: { name: string; slug: string }) =>
        parseResponse(
            source
                ? api.stories[':id'].duplicate.$post({ param: { id: String(source.id) }, json })
                : api.stories.$post({ json })
        ),
    onSuccess: async ({ id }) => {
        await queryClient.invalidateQueries({ queryKey: keys.stories })
        notify(source ? 'Post duplicated' : 'Post created')
        open.value = false
        await router.push({ name: 'story', params: { id } })
    },
})

const submit = () => {
    if (valid.value) save.mutate({ name: name.value.trim(), slug: slug.value })
}
</script>

<template>
    <UiDialog v-model:open="open" :title="source ? 'Duplicate post' : 'New post'">
        <form id="story-form" class="flex flex-col gap-4" @submit.prevent="submit">
            <label class="block">
                <span class="label">
                    Title
                    <span v-if="titleLimit" class="font-normal tracking-normal normal-case">
                        {{ name.length }}/{{ titleLimit }}
                    </span>
                </span>
                <input
                    v-model="name"
                    class="control"
                    required
                    autofocus
                    :maxlength="titleLimit"
                    placeholder="A great title"
                />
            </label>
            <label class="block">
                <span class="label">Slug</span>
                <div class="flex items-center gap-1 text-sm">
                    <span class="text-ink/60">blog/</span>
                    <input
                        :value="slug"
                        class="control font-mono"
                        required
                        :pattern="SLUG_PATTERN"
                        spellcheck="false"
                        @input="editSlug(($event.target as HTMLInputElement).value)"
                    />
                </div>
                <p class="hint">Lowercase letters, numbers and hyphens.</p>
            </label>
        </form>
        <template #footer>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton
                type="submit"
                form="story-form"
                variant="solid"
                :disabled="!valid"
                :loading="save.isPending.value"
            >
                {{ source ? 'Duplicate' : 'Create' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
