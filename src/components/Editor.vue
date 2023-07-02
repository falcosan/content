<template>
    <div class="w-full flex flex-col">
        <span
            v-if="title"
            class="block mb-5 text-lg font-semibold text-gray-800"
            v-text="title"
        />
        <div class="flex flex-col">
            <EditorContent
                :class="['h-full min-w-[2rem]', { 'min-h-[16rem]': tools }]"
                :editor="editor"
            />
            <div v-if="tools" class="lg:sticky lg:bottom-0 pb-5">
                <div
                    class="flex flex-wrap justify-end lg:justify-between -m-2.5"
                >
                    <div class="m-2.5 rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.format"
                            :key="action.type"
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
                            <Icon
                                v-if="action.icon"
                                class="mx-auto text-2xl"
                                :icon="action.icon"
                            />
                            <span v-else v-text="action.value" />
                        </button>
                    </div>
                    <div class="m-2.5 rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.history"
                            :key="action.type"
                            :class="[
                                'w-12 m-1 border rounded shadow border-gray-300 text-gray-500 bg-gray-200 active:text-gray-200 active:bg-gray-500',
                            ]"
                            style="font-variant: all-petite-caps"
                            @click="setText(action)"
                        >
                            <Icon
                                v-if="action.icon"
                                class="mx-auto text-2xl"
                                :icon="action.icon"
                            />
                            <span v-else v-text="action.value" />
                        </button>
                    </div>
                </div>
                <Modal v-model:open="modal">
                    <template #header>
                        <p
                            class="text-lg text-center font-bold text-gray-600"
                            v-text="'URL'"
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
                                    <Icon
                                        class="text-xl"
                                        icon="dashicons:yes"
                                    />
                                </button>
                            </div>
                        </div>
                    </template>
                </Modal>
            </div>
            <div class="w-full flex items-center justify-end">
                <span
                    class="inline-block mr-2 text-xs italic text-gray-500"
                    v-text="'words:'"
                />
                <span
                    class="inline-block font-bold text-xs italic text-gray-500"
                    v-text="renderLength"
                />
            </div>
        </div>
    </div>
</template>
<script>
import { Icon } from '@iconify/vue';
import Modal from '@/components/Modal';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { computed, reactive, toRefs, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { importFilter, checkEqualObjects } from '@/utils/object.js';
const extensions = [
    Highlight,
    StarterKit,
    Image.configure({ inline: true }),
    Link.configure({ openOnClick: false }),
];
export default {
    name: 'Editor',
    components: { Icon, Modal, EditorContent },
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
        refresh: {
            type: [Number, String],
            default: 0,
        },
    },
    emits: ['update:text', 'changed'],
    setup(props, { emit }) {
        const arrayCreate = (data, length = 5) =>
            Array.from({ length }, () => data);
        const state = reactive({
            modal: false,
            storage: null,
            changed: false,
            node: {
                type: '',
                scheme: [],
                argument: {},
            },
            current: {
                bold: false,
                link: false,
                code: false,
                italic: false,
                strike: false,
                paragraph: false,
                codeBlock: false,
                highlight: false,
                blockquote: false,
                heading: arrayCreate(false),
            },
        });
        const { storage, changed, modal, node, current } = toRefs(state);
        const editor = useEditor({
            extensions,
            editable: true,
            content: props.text,
            enablePasteRules: true,
            enableCoreExtensions: true,
            editorProps: {
                attributes: {
                    class: `${
                        props.tools ? 'markdown ' : ' '
                    }h-full min-h-[inherit] mb-5 py-2 px-2 rounded overflow-hidden border focus:border-gray-400 border-gray-200 focus-visible:outline-0`,
                },
            },
            onCreate() {
                storage.value = props.text;
            },
            onUpdate({ editor }) {
                const text = props.tools ? editor.getHTML() : editor.getText();
                changed.value = !checkEqualObjects(text, storage.value);
                emit('update:text', text);
            },
            onSelectionUpdate({ editor }) {
                checkFormats(editor);
            },
        });
        const actions = computed(() => [
            {
                value: 'B',
                type: 'bold',
                action: 'toggleBold',
                title: 'bold',
                active: current.value.bold,
            },
            {
                value: 'I',
                type: 'italic',
                action: 'toggleItalic',
                title: 'italic',
                active: current.value.italic,
            },
            {
                value: 'S̶',
                type: 'strike',
                action: 'toggleStrike',
                title: 'strike',
                active: current.value.strike,
            },
            {
                value: '¶',
                type: 'paragraph',
                action: 'setParagraph',
                title: 'paragraph',
                active: current.value.paragraph,
            },
            {
                value: 'H1',
                type: 'heading',
                action: 'toggleHeading',
                title: 'headingOne',
                active: current.value.heading[0],
                arg: { level: 1 },
            },
            {
                value: 'H2',
                type: 'heading',
                action: 'toggleHeading',
                title: 'headingTwo',
                active: current.value.heading[1],
                arg: { level: 2 },
            },
            {
                value: 'H3',
                type: 'heading',
                action: 'toggleHeading',
                title: 'headingThird',
                active: current.value.heading[2],
                arg: { level: 3 },
            },
            {
                value: 'H4',
                type: 'heading',
                action: 'toggleHeading',
                title: 'headingFourth',
                active: current.value.heading[3],
                arg: { level: 4 },
            },
            {
                value: 'H5',
                type: 'heading',
                action: 'toggleHeading',
                title: 'headingFifth',
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
                action: 'setImage',
                title: 'Image',
                icon: 'material-symbols:image',
                arg: { src: '' },
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
                icon: 'mdi:clear',
                value: 'clear',
            },
            {
                icon: 'material-symbols:undo',
                action: 'undo',
                value: 'undo',
            },
            {
                icon: 'material-symbols:redo',
                action: 'redo',
                value: 'redo',
            },
        ]);
        const renderLength = computed(
            () =>
                (
                    editor.value
                        ?.getText()
                        .replace(/(<([^>]+)>)/gi, '')
                        .match(/.*?\w+.*?(\s|$)/gi) || ''
                ).length
        );
        const setterActions = computed(() => {
            return {
                format: actions.value.filter((action) => action.type),
                history: actions.value.filter((action) =>
                    /clear|undo|redo/.test(action.value)
                ),
            };
        });
        const checkArguments = computed(() => {
            return !!Object.values(node.value.argument).filter(Boolean).length;
        });
        const toggleModal = (state) => {
            editor.value.setOptions({ editable: !state });
            modal.value = state;
        };
        const toggleNodeAction = (state) => {
            const action = actions.value.find(
                (action) => action.type === node.value.type
            );
            const edit = (operation) => {
                const trigger = editor.value.chain().focus();
                return trigger[operation](action.arg).run();
            };
            if (state) {
                node.value.scheme.forEach(
                    (key) => (action.arg[key] = node.value.argument[key])
                );
                edit(action.action);
            } else {
                edit(action.actionAlt ?? action.action);
            }
            node.value.argument = {};
            toggleModal(false);
        };
        const setText = (action) => {
            if (action.type) {
                const attributes = editor.value.getAttributes(action.type);
                if (action.type === 'heading') {
                    current.value.heading = arrayCreate(false);
                    current.value.paragraph = false;
                    editor.value.commands.toggleHeading(action.arg);
                    current.value.heading[action.arg.level - 1] =
                        editor.value.isActive(action.type, action.arg);
                } else {
                    if (action.type === 'paragraph') {
                        current.value.heading = arrayCreate(false);
                    }
                    if (action.arg) {
                        const scheme = Object.keys(action.arg);
                        if (attributes) {
                            const used = importFilter(
                                attributes,
                                Object.keys(action.arg),
                                true
                            );
                            scheme.forEach((arg) => {
                                node.value.argument[arg] = used[arg];
                            });
                        }
                        node.value.scheme = scheme;
                        node.value.type = action.type;
                        toggleModal(true);
                    } else {
                        editor.value.commands[action.action]();
                    }
                    current.value[action.type] = editor.value.isActive(
                        action.type
                    );
                }
            } else if (action.value === 'clear') {
                editor.value.chain().focus().clearNodes().unsetAllMarks().run();
                editor.value.commands.selectTextblockEnd();
            } else if (/undo|redo/.test(action.value)) {
                editor.value.commands[action.action]();
                editor.value.commands.selectTextblockEnd();
            } else {
                editor.value.commands[action.action](action.arg);
            }
            editor.value.commands.focus();
        };
        const checkFormats = (editor) => {
            current.value.link = editor.isActive('link');
            current.value.bold = editor.isActive('bold');
            current.value.code = editor.isActive('code');
            current.value.italic = editor.isActive('italic');
            current.value.strike = editor.isActive('strike');
            current.value.highlight = editor.isActive('highlight');
            current.value.paragraph = editor.isActive('paragraph');
            current.value.codeBlock = editor.isActive('codeBlock');
            current.value.blockquote = editor.isActive('blockquote');
            current.value.heading.map(
                (_, i) =>
                    (current.value.heading[i] = editor.isActive('heading', {
                        level: i + 1,
                    }))
            );
        };
        watch(
            () => props.text,
            (val) => {
                const text = props.tools
                    ? editor.value.getHTML()
                    : editor.value.getText();
                if (text === val) return;
                editor.value.commands.setContent(val);
            }
        );
        watch(
            () => props.refresh,
            () => {
                changed.value = false;
                storage.value = props.text;
            }
        );
        watch(changed, (val) => emit('changed', val));
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
        };
    },
};
</script>
