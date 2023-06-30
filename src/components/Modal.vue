<template>
    <div :class="['modal', { opened: open }]">
        <div
            v-show="open"
            ref="modal"
            class="fixed h-screen w-screen flex items-center justify-center left-0 top-0 px-2.5 md:px-5 z-20 bg-opacity-40 bg-gray-600"
            tabindex="0"
            @click.self="closeModal"
            @keydown.esc="closeModal"
        >
            <div class="w-full max-w-lg p-2.5 md:p-5 rounded bg-white">
                <div v-if="hasSlot('header')" class="mb-5">
                    <slot v-if="hasSlot('header')" name="header" />
                </div>
                <template v-if="hasSlot('body')">
                    <transition
                        enter-active-class="duration-300"
                        enter-class="opacity-0"
                    >
                        <div>
                            <slot name="body" />
                        </div>
                    </transition>
                </template>
            </div>
        </div>
    </div>
</template>
<script>
import { ref, watch, nextTick, useSlots, onBeforeUnmount } from "vue";
export default {
    props: {
        open: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const modal = ref(null);
        const checkModal = () => {
            if (props.open) {
                document.body.appendChild(modal.value);
                nextTick(() => modal.value.focus({ preventScroll: true }));
            } else {
                modal.value.parentNode.removeChild(modal.value);
                document
                    .querySelector(".modal.opened")
                    .appendChild(modal.value);
            }
        };
        const closeModal = () => emit("update:open", !props.open);
        const hasSlot = (name) => {
            const slots = useSlots();
            return Boolean(slots[name]);
        };
        onBeforeUnmount(() => {
            if (props.open) modal.value.parentNode.removeChild(modal.value);
        });
        watch(() => props.open, checkModal);
        return {
            modal,
            hasSlot,
            closeModal,
        };
    },
};
</script>
<style>
.body-container > * {
    @apply h-full object-contain;
}
.body-container > *:not(:first-child) {
    @apply mt-5;
}
</style>
