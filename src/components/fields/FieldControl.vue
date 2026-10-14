<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, useId } from 'vue'
import type { Field } from '@/api/client'
import RichEditor from '@/components/editor/RichEditor.vue'
import AssetField from './AssetField.vue'
import OptionsField from './OptionsField.vue'

const { field, error } = defineProps<{ field: Field; error?: string }>()

const model = defineModel<unknown>()

const id = useId()
const labelId = `${id}-label`
const hintId = `${id}-hint`
const errorId = `${id}-error`

const NATIVE = new Set(['text', 'textarea', 'datetime', 'option', 'number'])

const native = computed(() => NATIVE.has(field.type))
const invalid = computed(() => !!error)
const describedBy = computed(
    () => [field.description && hintId, error && errorId].filter(Boolean).join(' ') || undefined
)

const maxLength = computed(() => ('maxLength' in field ? field.maxLength : null))
const options = computed(() => ('options' in field ? field.options : []))
const withTime = computed(() => 'withTime' in field && field.withTime)

const text = computed({
    get: () => (typeof model.value === 'string' ? model.value : ''),
    set: (value: string) => (model.value = value),
})

const datetime = computed({
    get: () =>
        withTime.value ? text.value.replace(' ', 'T').slice(0, 16) : text.value.slice(0, 10),
    set: (value: string) => (text.value = withTime.value ? value.replace('T', ' ') : value),
})

const checked = computed({
    get: () => model.value === true,
    set: (value: boolean) => (model.value = value),
})
</script>

<template>
    <div>
        <div v-if="field.type !== 'boolean'" class="label">
            <label v-if="native" :id="labelId" :for="id">
                {{ field.label }}<span v-if="field.required" aria-hidden="true"> *</span>
            </label>
            <span v-else :id="labelId">
                {{ field.label }}<span v-if="field.required" aria-hidden="true"> *</span>
            </span>
            <span
                v-if="maxLength && field.type !== 'markdown'"
                class="font-normal tracking-normal normal-case"
            >
                {{ text.length }}/{{ maxLength }}
            </span>
        </div>

        <input
            v-if="field.type === 'text'"
            :id
            v-model="text"
            class="control"
            :maxlength="maxLength ?? undefined"
            :required="field.required"
            :aria-invalid="invalid || undefined"
            :aria-describedby="describedBy"
        />
        <textarea
            v-else-if="field.type === 'textarea'"
            :id
            v-model="text"
            rows="3"
            class="control min-h-24 resize-y field-sizing-content"
            :maxlength="maxLength ?? undefined"
            :required="field.required"
            :aria-invalid="invalid || undefined"
            :aria-describedby="describedBy"
        />
        <RichEditor
            v-else-if="field.type === 'markdown'"
            v-model="text"
            :max-length="maxLength"
            :invalid
            :labelled-by="labelId"
            :described-by="describedBy"
        />
        <input
            v-else-if="field.type === 'datetime'"
            :id
            v-model="datetime"
            :type="withTime ? 'datetime-local' : 'date'"
            class="control"
            :required="field.required"
            :aria-invalid="invalid || undefined"
            :aria-describedby="describedBy"
        />
        <select
            v-else-if="field.type === 'option'"
            :id
            v-model="text"
            class="control"
            :required="field.required"
            :aria-invalid="invalid || undefined"
            :aria-describedby="describedBy"
        >
            <option v-if="'allowEmpty' in field && field.allowEmpty" value="">—</option>
            <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.name }}
            </option>
        </select>
        <OptionsField
            v-else-if="field.type === 'options'"
            v-model="model"
            :options
            :max-options="'maxOptions' in field ? field.maxOptions : null"
            :labelled-by="labelId"
        />
        <AssetField
            v-else-if="field.type === 'asset'"
            v-model="model"
            :filetypes="'filetypes' in field ? field.filetypes : []"
            :labelled-by="labelId"
            :invalid
        />
        <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2 text-sm">
            <input
                :id
                v-model="checked"
                type="checkbox"
                class="size-4 accent-ink"
                :aria-describedby="describedBy"
            />
            {{ field.label }}
        </label>
        <input
            v-else-if="field.type === 'number'"
            :id
            v-model="text"
            type="number"
            class="control"
            :required="field.required"
            :aria-invalid="invalid || undefined"
            :aria-describedby="describedBy"
        />

        <p v-if="field.description" :id="hintId" class="hint">{{ field.description }}</p>
        <p
            v-if="error"
            :id="errorId"
            class="mt-1.5 flex items-center gap-1.5 text-xs font-semibold"
        >
            <CircleAlert class="size-3.5 shrink-0" aria-hidden="true" />
            {{ error }}
        </p>
    </div>
</template>
