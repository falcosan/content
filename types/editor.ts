import type { ChainedCommands } from '@tiptap/core'
import type { Component } from 'vue'

export type InsertKind = 'link' | 'image' | 'embed'

export interface Tool {
    label: string
    icon: Component
    active?: string
    disabled?: () => boolean
    run: (chain: ChainedCommands) => ChainedCommands
}

export interface FigureAttributes {
    src: string
    alt: string
    title: string
    caption: string
}

export interface ExtensionOptions {
    onImages: (files: File[], position?: number) => void
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        figure: {
            setFigure: (attributes: FigureAttributes) => ReturnType
        }
        embed: {
            setEmbed: (attributes: { src: string }) => ReturnType
        }
    }
}
