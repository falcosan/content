import '@tanstack/vue-query'
import type { Component } from 'vue'
import 'vue-router'
import type { AssetFolder } from './api'
import type { StoryContent } from './storyblok'

export type StatusFilter = 'all' | 'published' | 'draft'

export interface StoryFilters {
    search: string
    status: StatusFilter
}

export interface AssetFilters {
    search: string
    location: MediaLocation
}

export interface Page {
    page: number
    perPage: number
    total: number
}

export interface Draft {
    name: string
    slug: string
    content: StoryContent
}

export type FieldErrors = Record<string, string>

export type AssetKind = 'image' | 'video' | 'audio' | 'document' | 'file'

export interface AssetValue {
    id: number | null
    alt: string
    name: string
    focus: string
    title: string
    source: string
    filename: string
    copyright: string
    fieldtype: 'asset'
    meta_data: Record<string, unknown>
    is_external_url: boolean
}

export interface UploadOptions {
    folderId: number | null
    onProgress?: (ratio: number) => void
}

type UploadStatus = 'uploading' | 'done' | 'failed'

export interface UploadItem {
    id: number
    name: string
    progress: number
    status: UploadStatus
    error: string
}

export interface AssetMetadata {
    alt: string
    title: string
    copyright: string
    source: string
    folderId: number | null
}

export interface FolderInput {
    name: string
    parentId: number | null
}

export interface FolderNode extends AssetFolder {
    depth: number
}

export type MediaLocation = number | null | 'trash'

export interface Credentials {
    user: string
    password: string
}

export interface ConfirmOptions {
    title: string
    message: string
    action: string
}

export interface ConfirmRequest extends ConfirmOptions {
    resolve: (confirmed: boolean) => void
}

export type ToastTone = 'info' | 'error'

export interface Toast {
    id: number
    message: string
    tone: ToastTone
}

export interface MenuItem {
    label: string
    icon: Component
    hint?: string
    disabled?: boolean
    loading?: boolean
    href?: string
    run?: () => void
}

export type Provider = [pattern: RegExp, toEmbed: (match: RegExpExecArray, url: URL) => string]

declare module 'vue-router' {
    interface RouteMeta {
        public?: boolean
        title?: string
    }
}

declare module '@tanstack/vue-query' {
    interface Register {
        mutationMeta: { silent?: boolean }
    }
}
