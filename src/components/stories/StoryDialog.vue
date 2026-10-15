<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, parseResponse } from '@/api/client'
import { fieldsQuery, keys } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { notify } from '@/composables/useToasts'
import { BLOG } from '../../../shared/blog'
import { MAX_LENGTH } from '../../../shared/validation'

const { source } = defineProps<{
    source?: { id: number; title: string }
}>()

const open = defineModel<boolean>('open', { required: true })

const queryClient = useQueryClient()
const router = useRouter()
const { data: fields } = useQuery(fieldsQuery())
const formId = useId()
const titleId = useId()

const save = useMutation({
    mutationFn: (json: { title: string }) =>
        parseResponse(
            source
                ? api.stories[':id'].duplicate.$post({ param: { id: String(source.id) }, json })
                : api.stories.$post({ json })
        ),
    onSuccess: async ({ id }) => {
        void queryClient.invalidateQueries({ queryKey: keys.stories })
        notify(source ? 'Post duplicated' : 'Post created')
        open.value = false
        await router.push({ name: 'story', params: { id } })
    },
})

const title = ref('')

const titleLimit = computed(() => {
    const field = fields.value?.find(({ key }) => key === BLOG.fields.title)
    return field && 'maxLength' in field ? (field.maxLength ?? undefined) : undefined
})

const maxLength = computed(() =>
    Math.min(titleLimit.value ?? MAX_LENGTH.storyName, MAX_LENGTH.storyName)
)

const tooLong = computed(() => title.value.length > maxLength.value)

const valid = computed(() => !!title.value.trim() && !tooLong.value)

watch(open, (isOpen) => {
    if (isOpen) title.value = source ? `${source.title} (copy)` : ''
})

const submit = () => {
    if (valid.value) save.mutate({ title: title.value.trim() })
}
</script>

<template>
    <UiDialog v-model:open="open" :title="source ? 'Duplicate post' : 'New post'">
        <form :id="formId" @submit.prevent="submit">
            <div class="label">
                <label :for="titleId">Title</label>
                <span v-if="titleLimit" class="font-normal tracking-normal normal-case">
                    {{ title.length }}/{{ titleLimit }}
                </span>
            </div>
            <input
                :id="titleId"
                v-model="title"
                class="control"
                required
                autofocus
                :maxlength="maxLength"
                :aria-invalid="tooLong || undefined"
                placeholder="A great title"
            />
        </form>
        <template #footer>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton
                type="submit"
                :form="formId"
                variant="solid"
                :disabled="!valid"
                :loading="save.isPending.value"
            >
                {{ source ? 'Duplicate' : 'Create' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
