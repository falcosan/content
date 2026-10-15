<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { api, errorMessage, parseResponse } from '@/api/client'
import { keys, versionsQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { confirmAction } from '@/composables/useConfirm'
import { notify } from '@/composables/useToasts'
import { formatDateTime } from '@/lib/format'

const { storyId, locked = false } = defineProps<{ storyId: number; locked?: boolean }>()

const open = defineModel<boolean>('open', { required: true })

const STATUS: Record<string, string> = {
    draft: 'Saved',
    published: 'Published',
    unpublished: 'Unpublished',
    workflow_stage_changed: 'Stage changed',
    scheduled_story: 'Scheduled',
    released: 'Released',
}

const queryClient = useQueryClient()
const versions = useQuery(computed(() => ({ ...versionsQuery(storyId), enabled: open.value })))

const restore = useMutation({
    mutationFn: (versionId: number) =>
        parseResponse(
            api.stories[':id'].versions[':versionId'].restore.$post({
                param: { id: String(storyId), versionId: String(versionId) },
            })
        ),
    onSuccess: async () => {
        void queryClient.invalidateQueries({ queryKey: keys.stories })
        await queryClient.invalidateQueries({ queryKey: keys.story(storyId) })
        notify('Version restored')
        open.value = false
    },
})

const askRestore = async (versionId: number, createdAt: string) => {
    const confirmed = await confirmAction({
        title: 'Restore version',
        message: `Replace the current draft with the version from ${formatDateTime(createdAt)}?`,
        action: 'Restore version',
    })
    if (confirmed) restore.mutate(versionId)
}
</script>

<template>
    <UiDialog v-model:open="open" title="Version history">
        <p v-if="locked" class="mb-4 rounded-md border border-border px-3 py-2 text-sm">
            Save or discard your changes before restoring a version.
        </p>
        <p v-if="versions.isError.value" role="alert" class="text-sm">
            {{ errorMessage(versions.error.value) }}
        </p>
        <p v-else-if="versions.isPending.value" class="text-sm text-text-light" aria-busy="true">
            Loading versions…
        </p>
        <p v-else-if="!versions.data.value?.length" class="text-sm text-text-light">
            No versions are available. Storyblok keeps them for a limited time depending on your
            plan.
        </p>
        <ol v-else class="divide-y divide-border/40">
            <li
                v-for="version in versions.data.value"
                :key="version.id"
                class="flex items-center justify-between gap-4 py-3"
            >
                <div class="min-w-0">
                    <p class="text-sm font-medium">{{ formatDateTime(version.createdAt) }}</p>
                    <p class="text-xs text-text-light">
                        {{ STATUS[version.status] ?? version.status }}
                        <template v-if="version.author"> · {{ version.author }}</template>
                    </p>
                </div>
                <UiButton
                    size="sm"
                    :icon="RotateCcw"
                    :disabled="locked || restore.isPending.value"
                    @click="askRestore(version.id, version.createdAt)"
                >
                    Restore
                </UiButton>
            </li>
        </ol>
    </UiDialog>
</template>
