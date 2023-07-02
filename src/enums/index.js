const webTitle = 'Aprograma Editor';

export default {
    webTitle,
    translatableSuffix: '__i18n__',
    languages: ['en', 'es', 'it'],
    metaHtml: { title: { variable: 'META_TITLE', value: webTitle } },
    manifest: {
        name: webTitle,
        short_name: webTitle,
        description: webTitle,
        theme_color: '#ffffff',
        icons: [
            {
                src: 'icons/icon-48x48.png',
                sizes: '48x48',
                type: 'image/png',
            },
            {
                src: 'icons/icon-72x72.png',
                sizes: '72x72',
                type: 'image/png',
            },
            {
                src: 'icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
            },
            {
                src: 'icons/icon-128x128.png',
                sizes: '128x128',
                type: 'image/png',
            },
            {
                src: 'icons/icon-144x144.png',
                sizes: '144x144',
                type: 'image/png',
            },
            {
                src: 'icons/icon-152x152.png',
                sizes: '152x152',
                type: 'image/png',
            },
            {
                src: 'icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: 'icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    },
};
