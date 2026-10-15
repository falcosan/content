<script setup lang="ts">
import { Ellipsis } from '@lucide/vue'
import { useId, useTemplateRef, type Component } from 'vue'
import type { MenuItem } from '#types/app'
import { roveFocus } from '@/lib/focus'
import UiButton from './UiButton.vue'

const {
    items,
    label = 'More actions',
    icon = Ellipsis,
} = defineProps<{
    items: MenuItem[]
    label?: string
    icon?: Component
}>()

defineOptions({ inheritAttrs: false })

const ITEM_CLASS =
    'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:not-disabled:bg-text/10 focus-visible:bg-text/10 disabled:opacity-40'

const id = useId()

const menu = useTemplateRef('menu')

const enabledItems = () =>
    [...(menu.value?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])].filter(
        (item) => !item.hasAttribute('disabled')
    )

const onToggle = (event: ToggleEvent) => {
    if (event.newState === 'open') enabledItems()[0]?.focus()
}

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') menu.value?.hidePopover()
    else roveFocus(event, enabledItems(), ['ArrowUp', 'ArrowDown'])
}

const select = (item: MenuItem) => {
    menu.value?.hidePopover()
    item.run?.()
}
</script>

<template>
    <UiButton
        v-bind="$attrs"
        variant="ghost"
        size="sm"
        :icon
        :popovertarget="id"
        :aria-label="label"
        :title="label"
        aria-haspopup="menu"
        :style="{ anchorName: `--${id}` }"
    />
    <div
        :id
        ref="menu"
        popover
        role="menu"
        :aria-label="label"
        class="anchored-popover max-w-[calc(100vw-2rem)] min-w-48 rounded-md border border-border bg-bg p-1 text-text"
        :style="{ positionAnchor: `--${id}` }"
        @toggle="onToggle"
        @keydown="onKeydown"
    >
        <template v-for="(item, index) in items" :key="item.label">
            <a
                v-if="item.href"
                role="menuitem"
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
                :class="ITEM_CLASS"
                @click="menu?.hidePopover()"
            >
                <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
                {{ item.label }}
            </a>
            <button
                v-else
                role="menuitem"
                type="button"
                :aria-label="item.label"
                :aria-describedby="item.hint ? `${id}-hint-${index}` : undefined"
                :disabled="item.disabled || item.loading"
                :class="ITEM_CLASS"
                @click="select(item)"
            >
                <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
                <span>
                    {{ item.label }}
                    <span
                        v-if="item.hint"
                        :id="`${id}-hint-${index}`"
                        class="block text-xs whitespace-normal text-text-light"
                    >
                        {{ item.hint }}
                    </span>
                </span>
            </button>
        </template>
    </div>
</template>
