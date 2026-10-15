export const BLOG = {
    folder: 'blog',
    component: 'Post',
    fields: {
        title: 'title',
        intro: 'intro',
        date: 'date',
        cover: 'file',
    },
    hiddenFields: ['align_text'],
} as const
