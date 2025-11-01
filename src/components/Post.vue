<script setup>
import { Icon } from '@iconify/vue'
import Editor from '@/components/Editor'
import { dateWithoutHour } from '@/utils/date'
import { useDetail } from '@/composables/useDetail'

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
})
const emits = defineEmits(['ready'])
const { modal, detail, inputs, editors, loading, modalType, editDetail, goToDetail, toggleDetail } =
    useDetail(props, emits)
</script>

<template>
    <div v-if="detail.content">
        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
        >
            <div
                v-if="modal.state"
                :class="[
                    'fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg font-semibold',
                    modalType[modal.type].background,
                    modalType[modal.type].text,
                ]"
            >
                {{ modal.message }}
            </div>
        </Transition>
        <div class="grid grid-cols-12 gap-x-5">
            <div
                v-for="(input, indexInput) in inputs"
                :key="indexInput"
                class="col-span-12 md:col-span-6 xl:col-span-4 mb-10"
            >
                <span
                    v-if="input.title"
                    class="block mb-5 text-lg font-semibold text-gray-300"
                    v-text="input.title"
                />
                <input
                    :value="dateWithoutHour(detail.content[input.value])"
                    :type="input.type"
                    @input="({ target }) => (detail.content[input.value] = target.value)"
                />
            </div>
        </div>
        <Editor
            v-for="(editor, indexEditor) in editors"
            :key="indexEditor"
            v-model:text="detail.content[editor.value]"
            :title="editor.title"
            :tools="editor.markdown"
            :max="editor.max"
        />
        <div class="flex flex-wrap justify-center xs:justify-end mt-10 -m-2.5">
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-slate-700/70 text-white bg-slate-700"
                @click="goToDetail"
            >
                <span v-text="'Post'" />
            </button>
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-blue-500/70 text-white bg-blue-500"
                @click="editDetail"
            >
                <Icon v-if="loading.edit" class="text-2xl" icon="eos-icons:three-dots-loading" />
                <span v-else v-text="'Save'" />
            </button>
            <button
                :class="[
                    'w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold text-white',
                    detail.published
                        ? 'active:bg-red-500/70 bg-red-500'
                        : 'active:bg-green-500/70 bg-green-500',
                ]"
                @click="toggleDetail"
            >
                <Icon v-if="loading.toggle" class="text-2xl" icon="eos-icons:three-dots-loading" />
                <span v-else v-text="detail.published ? 'Unpublish' : 'Publish'" />
            </button>
        </div>
    </div>
</template>
