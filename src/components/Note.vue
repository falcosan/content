<script setup>
import { Icon } from '@iconify/vue'
import Modal from '@/components/Modal'
import Editor from '@/components/Editor'
import { useDetail } from '@/composables/useDetail'

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
})
const {
    modal,
    detail,
    locale,
    editors,
    loading,
    modalType,
    editDetail,
    goToDetail,
    properties,
    translatable,
    checkProperties,
} = useDetail(props)
</script>

<template>
    <div v-if="detail.content">
        <Editor
            v-for="(editor, indexEditor) in editors"
            :key="`${indexEditor}_${locale}`"
            v-model:text="detail.content[editor.value]"
            :title="editor.title"
            :tools="editor.markdown"
        />
        <div class="flex flex-wrap justify-center xs:justify-end mt-10 -m-2.5">
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-slate-700"
                @click="goToDetail"
            >
                <span v-text="'Note'" />
            </button>
            <button
                class="w-full sm:w-32 flex justify-center m-2.5 p-2.5 px-6 rounded font-semibold active:bg-opacity-70 text-white bg-blue-500"
                @click="editDetail"
            >
                <Icon v-if="loading.edit" class="text-2xl" icon="eos-icons:three-dots-loading" />
                <span v-else v-text="'Save'" />
            </button>
        </div>
        <Modal v-model:open="modal.state">
            <template v-if="modal.type" #body>
                <div
                    :class="[
                        'p-2.5 md:p-5 rounded text-center text-xl font-semibold',
                        modalType[modal.type].background,
                    ]"
                >
                    <span :class="[modalType[modal.type].text]" v-text="modal.message" />
                </div>
            </template>
        </Modal>
    </div>
</template>
