<template>
    <div class="w-full flex flex-col">
        <span v-if="title" class="block mb-5 text-lg font-semibold text-gray-800" v-text="title" />
        <div class="flex flex-col">
            <EditorContent
                :class="['h-full min-w-[2rem]', { 'min-h-[16rem]': tools }]"
                :editor="editor"
            />
            <div v-if="tools" class="lg:sticky lg:bottom-0 pb-5">
                <div class="flex flex-wrap justify-end lg:justify-between -m-2.5">
                    <div class="m-2.5 rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.format"
                            :key="action.type"
                            :title="action.title"
                            :class="[
                                'w-12 align-middle m-1 border rounded shadow active:bg-gray-300 border-gray-300',
                                action.active
                                    ? 'text-gray-200 bg-gray-500'
                                    : 'text-gray-500 bg-gray-200',
                                { 'font-bold': action.type === 'bold' },
                                { italic: action.type === 'italic' },
                            ]"
                            @click="setText(action)"
                        >
                            <Icon v-if="action.icon" class="mx-auto text-2xl" :icon="action.icon" />
                            <span v-else v-text="action.value" />
                        </button>
                    </div>
                    <div class="m-2.5 rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.history"
                            :key="action.type"
                            :title="action.title"
                            :class="[
                                'w-12 m-1 border rounded shadow border-gray-300 text-gray-500 bg-gray-200 active:text-gray-200 active:bg-gray-500',
                            ]"
                            style="font-variant: all-petite-caps"
                            @click="setText(action)"
                        >
                            <Icon v-if="action.icon" class="mx-auto text-2xl" :icon="action.icon" />
                            <span v-else v-text="action.value" />
                        </button>
                    </div>
                </div>
                <Modal v-model:open="modal">
                    <template #header>
                        <p
                            class="text-lg text-center font-bold text-gray-600"
                            v-text="'Complete the fields'"
                        />
                    </template>
                    <template #body>
                        <div class="w-full">
                            <input
                                v-for="(input, indexInput) in node.scheme"
                                :key="indexInput"
                                v-model="node.argument[input]"
                                class="mb-5"
                                :placeholder="input"
                            />
                            <div class="flex flex-wrap -m-2">
                                <button
                                    class="flex justify-center flex-auto py-2 px-5 m-2 rounded active:bg-opacity-70 text-white bg-red-500"
                                    @click="toggleNodeAction(false)"
                                >
                                    <Icon class="text-xl" icon="dashicons:no" />
                                </button>
                                <button
                                    :class="[
                                        'flex justify-center flex-auto py-2 px-5 m-2 rounded  active:bg-opacity-70',
                                        checkArguments
                                            ? 'text-white bg-green-500'
                                            : 'text-gray-500 bg-gray-200',
                                    ]"
                                    :disabled="!checkArguments"
                                    @click="toggleNodeAction(true)"
                                >
                                    <Icon class="text-xl" icon="dashicons:yes" />
                                </button>
                            </div>
                        </div>
                    </template>
                </Modal>
            </div>
            <div class="w-full flex flex-wrap items-center justify-end">
                <div v-if="renderLength.max" class="m-1">
                    <span class="inline-block mr-1 text-xs italic text-gray-500" v-text="'max:'" />
                    <span
                        class="inline-block font-bold text-xs italic text-gray-500"
                        v-text="renderLength.max"
                    />
                </div>
                <div class="m-1">
                    <span
                        class="inline-block mr-1 text-xs italic text-gray-500"
                        v-text="'characters:'"
                    />
                    <span
                        class="inline-block font-bold text-xs italic text-gray-500"
                        v-text="renderLength.characters"
                    />
                </div>
                <div class="m-1">
                    <span
                        class="inline-block mr-1 text-xs italic text-gray-500"
                        v-text="'words:'"
                    />
                    <span
                        class="inline-block font-bold text-xs italic text-gray-500"
                        v-text="renderLength.words"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { Icon } from '@iconify/vue'
import Modal from '@/components/Modal'
import TurndownService from 'turndown'
import StarterKit from '@tiptap/starter-kit'
import { importFilter } from '@/utils/object'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { computed, reactive, toRefs, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { CodeBlock, Image, CharacterCount, Link } from './Extensions'
const extensions = [
    Image,
    Underline,
    Highlight,
    CodeBlock,
    StarterKit.configure({ codeBlock: false }),
]
export default {
    name: 'Editor',
    components: { Icon, Modal, EditorContent },
    provide() {
        return {
            setText: (action) => this.setText(action),
        }
    },
    props: {
        text: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            default: '',
        },
        tools: {
            type: Boolean,
            default: false,
        },
        max: {
            type: [Number, String, null],
            default: null,
        },
    },
    emits: ['update:text'],
    setup(props, { emit }) {
        const arrayCreate = (data, length = 5) => Array.from({ length }, () => data)
        const state = reactive({
            modal: false,
            node: {
                type: '',
                scheme: [],
                argument: {},
            },
            current: {
                bold: false,
                link: false,
                code: false,
                image: false,
                italic: false,
                strike: false,
                underline: false,
                paragraph: false,
                codeBlock: false,
                highlight: false,
                blockquote: false,
                heading: arrayCreate(false),
            },
        })
        const { modal, node, current } = toRefs(state)
        const checkMax = computed(() => props.max && !isNaN(+props.max))
        const dynamicExtensions = computed(() => [
            CharacterCount.configure({ ...(checkMax.value && { limit: props.max }) }),
            Link.configure({ openOnClick: false, autolink: props.tools, linkOnPaste: props.tools }),
        ])
        const editor = useEditor({
            extensions: [...extensions, ...dynamicExtensions.value],
            editable: true,
            content: props.text,
            enablePasteRules: true,
            enableCoreExtensions: true,
            editorProps: {
                ...(!props.tools && {
                    transformPastedText(text) {
                        return text.replace(/(<([^>]+)>)|\r|\n/gim, '')
                    },
                    transformPastedHTML(html) {
                        return html.replace(/(<([^>]+)>)|\r|\n/gim, '')
                    },
                }),
                attributes: {
                    class: `${props.tools ? 'markdown' : 'plain'} h-full min-h-[inherit] mb-2.5`,
                },
            },
            onUpdate({ editor }) {
                checkFormats(editor)
                emit('update:text', setContent(editor))
            },
            onTransaction({ editor }) {
                checkFormats(editor)
            },
            onSelectionUpdate({ editor }) {
                checkFormats(editor)
            },
        })
        const actions = computed(() => [
            {
                value: 'B',
                type: 'bold',
                action: 'toggleBold',
                title: 'Bold',
                active: current.value.bold,
            },
            {
                value: 'I',
                type: 'italic',
                action: 'toggleItalic',
                title: 'Italic',
                active: current.value.italic,
            },
            {
                value: 'U',
                type: 'underline',
                action: 'toggleUnderline',
                title: 'Underline',
                active: current.value.underline,
            },
            {
                value: 'S̶',
                type: 'strike',
                action: 'toggleStrike',
                title: 'Strike',
                active: current.value.strike,
            },
            {
                value: '¶',
                type: 'paragraph',
                action: 'setParagraph',
                title: 'Paragraph',
                active: current.value.paragraph,
            },
            {
                value: 'H1',
                type: 'heading',
                action: 'toggleHeading',
                title: 'H1',
                active: current.value.heading[0],
                arg: { level: 1 },
            },
            {
                value: 'H2',
                type: 'heading',
                action: 'toggleHeading',
                title: 'H2',
                active: current.value.heading[1],
                arg: { level: 2 },
            },
            {
                value: 'H3',
                type: 'heading',
                action: 'toggleHeading',
                title: 'H3',
                active: current.value.heading[2],
                arg: { level: 3 },
            },
            {
                value: 'H4',
                type: 'heading',
                action: 'toggleHeading',
                title: 'H4',
                active: current.value.heading[3],
                arg: { level: 4 },
            },
            {
                value: 'H5',
                type: 'heading',
                action: 'toggleHeading',
                title: 'H5',
                active: current.value.heading[4],
                arg: { level: 5 },
            },
            {
                type: 'highlight',
                title: 'Highlight',
                action: 'toggleHighlight',
                active: current.value.highlight,
                icon: 'ant-design:highlight-twotone',
            },
            {
                type: 'blockquote',
                title: 'Blockquote',
                action: 'toggleBlockquote',
                active: current.value.blockquote,
                icon: 'bi:quote',
            },
            {
                type: 'link',
                title: 'Link',
                action: 'setLink',
                actionAlt: 'unsetLink',
                active: current.value.link,
                icon: 'material-symbols:link',
                arg: { href: '' },
            },
            {
                type: 'image',
                action: 'addImage',
                actionAlt: 'removeImage',
                title: 'Image',
                icon: 'material-symbols:image',
                arg: { src: '', caption: '', alt: '', title: '' },
                active: current.value.image,
            },
            {
                type: 'code',
                action: 'toggleCode',
                title: 'Code',
                icon: 'material-symbols:code',
                active: current.value.code,
            },
            {
                type: 'codeBlock',
                action: 'toggleCodeBlock',
                title: 'CodeBlock',
                icon: 'ci:window-code-block',
                active: current.value.codeBlock,
            },
            {
                action: 'clearNodes',
                title: 'Clear',
                icon: 'mdi:clear',
                value: 'clear',
            },
            {
                icon: 'material-symbols:undo',
                title: 'Undo',
                action: 'undo',
                value: 'undo',
            },
            {
                icon: 'material-symbols:redo',
                title: 'Redo',
                action: 'redo',
                value: 'redo',
            },
            {
                action: toggleMarkdown,
                title: 'Copy Markdown',
                icon: 'simple-icons:markdown',
                value: 'markdown',
            },
        ])
        const renderLength = computed(() => {
            const text = editor.value?.getText() ?? ''
            return {
                ...(checkMax.value && { max: props.max }),
                words: (text.replace(/(<([^>]+)>)/gim, '').match(/.*?\w+.*?(\s|$)/gim) || '')
                    .length,
                characters: text.replace(/(<([^>]+)>)/gim, '').length,
            }
        })
        const setterActions = computed(() => {
            return {
                format: actions.value.filter((action) => action.type),
                history: actions.value.filter((action) =>
                    /clear|undo|redo|markdown/.test(action.value)
                ),
            }
        })
        const checkArguments = computed(() => {
            return !!Object.values(node.value.argument).filter(Boolean).length
        })
        const setContent = (editor) => {
            return props.tools ? editor.getHTML() : editor.getText()
        }
        const getAction = (type) => {
            if (typeof type === 'string') {
                return actions.value.find((action) => action.type === type)
            } else return type
        }
        const resetNode = () => {
            node.value = { type: '', scheme: [], argument: {} }
        }
        const toggleMarkdown = () => {
            const td = new TurndownService({
                hr: '---',
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
            })
            td.addRule('mark', {
                filter: 'mark',
                replacement: (content) => `<mark>${content}</mark>`
            });
            td.addRule('br', {
                filter: 'br',
                replacement: () => '<p>\n</p>'
            });
            navigator.clipboard.writeText(td.turndown(props.text))
        }
        const toggleModal = (state) => (modal.value = state)
        const toggleNodeAction = (state) => {
            const action = getAction(node.value.type)
            const edit = (operation) => {
                const trigger = editor.value.chain().focus()
                return trigger[operation](action.arg).run()
            }
            if (state) {
                node.value.scheme.forEach((key) => (action.arg[key] = node.value.argument[key]))
                edit(action.action)
            } else {
                edit(action.actionAlt ?? action.action)
            }
            toggleModal(false)
        }
        const setText = (type) => {
            const action = getAction(type)
            if (typeof action.action === 'function') {
                action.action()
            } else {
                if (action.type) {
                    const attributes = editor.value.getAttributes(action.type)
                    if (action.type === 'heading') {
                        current.value.heading = arrayCreate(false)
                        current.value.paragraph = false
                        editor.value.commands.toggleHeading(action.arg)
                        current.value.heading[action.arg.level - 1] = editor.value.isActive(
                            action.type,
                            action.arg
                        )
                    } else {
                        if (action.type === 'paragraph') {
                            current.value.heading = arrayCreate(false)
                        }
                        if (action.arg) {
                            const scheme = Object.keys(action.arg)
                            if (attributes) {
                                const used = importFilter(attributes, Object.keys(action.arg), true)
                                scheme.forEach((arg) => {
                                    node.value.argument[arg] = used[arg]
                                })
                            }
                            node.value.scheme = scheme
                            node.value.type = action.type
                            toggleModal(true)
                        } else {
                            editor.value.commands.focus()
                            editor.value.commands[action.action]()
                        }
                        current.value[action.type] = editor.value.isActive(action.type)
                    }
                } else if (action.value === 'clear') {
                    editor.value.chain().focus().clearNodes().unsetAllMarks().run()
                    editor.value.commands.selectTextblockEnd()
                } else if (/undo|redo/.test(action.value)) {
                    editor.value.commands[action.action]()
                    editor.value.commands.selectTextblockEnd()
                } else {
                    editor.value.commands[action.action](action.arg)
                }
            }
        }
        const checkFormats = (editor) => {
            current.value.link = editor.isActive('link')
            current.value.bold = editor.isActive('bold')
            current.value.code = editor.isActive('code')
            current.value.image = editor.isActive('image')
            current.value.italic = editor.isActive('italic')
            current.value.strike = editor.isActive('strike')
            current.value.underline = editor.isActive('underline')
            current.value.highlight = editor.isActive('highlight')
            current.value.paragraph = editor.isActive('paragraph')
            current.value.codeBlock = editor.isActive('codeBlock')
            current.value.blockquote = editor.isActive('blockquote')
            current.value.heading.map(
                (_, i) =>
                    (current.value.heading[i] = editor.isActive('heading', {
                        level: i + 1,
                    }))
            )
        }
        watch(
            () => props.text,
            (val) => {
                const text = setContent(editor.value)
                if (text === val) return
                editor.value.commands.setContent(val)
            }
        )
        watch(modal, (val) => {
            if (!val) resetNode()
            editor.value.setOptions({ editable: !val })
        })
        return {
            node,
            modal,
            editor,
            current,
            actions,
            setText,
            renderLength,
            setterActions,
            checkArguments,
            toggleNodeAction,
        }
    },
}
</script>
