import type { createApp } from '../server/app'
import type { StoryContent } from './storyblok'

export type StoryStatus = 'draft' | 'published' | 'changed'

export interface StorySummary {
    id: number
    status: StoryStatus
    updatedAt: string
    title: string
    intro: string
    date: string | null
    cover: string | null
}

export interface Story {
    id: number
    previewToken: string
    status: StoryStatus
    url: string
    updatedAt: string
    firstPublishedAt: string | null
    content: StoryContent
}

export interface StoryVersion {
    id: number
    createdAt: string
    status: string
    author: string
}

export interface Asset {
    id: number
    url: string
    name: string
    contentType: string
    size: number | null
    width: number | null
    height: number | null
    alt: string
    title: string
    copyright: string
    source: string
    folderId: number | null
    createdAt: string
    deletedAt: string | null
}

export interface AssetFolder {
    id: number
    name: string
    parentId: number | null
}

export interface FieldOption {
    name: string
    value: string
}

export interface FieldBase {
    key: string
    label: string
    required: boolean
    description: string
}

export type Field =
    | (FieldBase & { type: 'text' | 'textarea' | 'markdown'; maxLength: number | null })
    | (FieldBase & { type: 'datetime'; withTime: boolean })
    | (FieldBase & { type: 'option'; options: FieldOption[]; allowEmpty: boolean })
    | (FieldBase & {
          type: 'options'
          options: FieldOption[]
          maxOptions: number | null
          allowNewOptions: boolean
      })
    | (FieldBase & { type: 'asset'; filetypes: string[]; allowExternalUrl: boolean })
    | (FieldBase & { type: 'boolean' | 'number' })

export type AppType = ReturnType<typeof createApp>
