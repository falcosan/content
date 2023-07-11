import Link from '@tiptap/extension-link'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const CustomLink = Link.extend({
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('eventHandler'),
                props: {
                    handleClick(_, __, event) {
                        let target = event.target
                        while (target && !target.href) target = target.parentNode
                        if (target && event.metaKey && /mouseup|click/.test(event.type)) {
                            event.preventDefault()
                            window.open(target.href, '_blank', 'noopener,noreferrer,nofollow')
                        }
                    },
                },
            }),
        ]
    },
})
