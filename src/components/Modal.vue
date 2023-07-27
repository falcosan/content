<template>
    <div v-if="show" :class="['modal', { opened: open }]">
        <div
            v-show="open"
            ref="modal"
            class="fixed h-screen w-screen flex items-center justify-center left-0 top-0 px-2.5 md:px-5 z-20 bg-opacity-40 bg-gray-900"
            tabindex="0"
            @click.self="closeModal"
            @keydown.esc="closeModal"
        >
            <div class="w-full max-w-lg p-2.5 md:p-5 rounded bg-white">
                <div v-if="hasSlot('header')" class="mb-5">
                    <slot name="header" />
                </div>
                <div v-if="hasSlot('body')">
                    <slot name="body" />
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { ref, watch, nextTick, useSlots, onBeforeUnmount, reactive, toRefs } from 'vue'
export default {
    props: {
        open: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:open'],
    setup(props, { emit }) {
        const modal = ref(null)
        const state = reactive({
            show: false,
        })
        const { show } = toRefs(state)
        const checkModal = () => {
            if (props.open) {
                show.value = true
                nextTick(() => {
                    document.body.appendChild(modal.value)
                    modal.value.focus({ preventScroll: true })
                })
            } else {
                modal.value.parentNode.removeChild(modal.value)
                document.querySelector('.modal.opened').appendChild(modal.value)
                show.value = false
            }
        }
        const closeModal = () => emit('update:open', !props.open)
        const hasSlot = (name) => {
            const slots = useSlots()
            return Boolean(slots[name])
        }
        onBeforeUnmount(() => {
            if (props.open) modal.value.parentNode.removeChild(modal.value)
        })
        watch(() => props.open, checkModal)
        return {
            show,
            modal,
            hasSlot,
            closeModal,
        }
    },
}
</script>
