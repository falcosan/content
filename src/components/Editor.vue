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

            <div v-if="tools" class="sticky bottom-0 pb-5">
                <div class="flex flex-wrap justify-between">
                    <div class="rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.format"
                            :key="action.tag"
                            :class="[
                                'w-12 m-1 border rounded shadow active:bg-gray-300 border-gray-300',
                                action.active
                                    ? 'text-gray-200 bg-gray-500'
                                    : 'text-gray-500 bg-gray-200',
                                { 'font-bold': action.type === 'bold' },
                                { italic: action.type === 'italic' },
                            ]"
                            v-text="action.value"
                            @click="setText(action)"
                        />
                    </div>
                    <div class="rounded border border-gray-200 bg-white">
                        <button
                            v-for="action in setterActions.history"
                            :key="action.tag"
                            :class="[
                                'w-12 m-1 border rounded shadow border-gray-300 text-gray-500 bg-gray-200 active:text-gray-200 active:bg-gray-500',
                            ]"
                            style="font-variant: all-petite-caps"
                            v-text="action.value"
                            @click="setText(action)"
                        />
                    </div>
                </div>
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
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import ListItem from "@tiptap/extension-list-item";
import { computed, reactive, toRefs, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
const extensions = [
    Link,
    ListItem.extend({ content: "text*" }),
    Image.configure({ inline: true, allowBase64: true }),
    StarterKit.configure({ history: true, listItem: false }),
];
export default {
    name: "Editor",
    components: { EditorContent },
    props: {
        text: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            default: "",
        },
        tools: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["update:text"],
    setup(props, { emit }) {
        const arrayCreate = (data, length = 5) =>
            Array.from({ length }, () => data);
        const state = reactive({
            current: {
                bold: false,
                link: false,
                italic: false,
                strike: false,
                paragraph: false,
                heading: arrayCreate(false),
            },
        });
        const { current } = toRefs(state);
        const editor = useEditor({
            extensions,
            editable: true,
            content: props.text,
            enablePasteRules: true,
            enableCoreExtensions: true,
            editorProps: {
                attributes: {
                    class: `${
                        props.tools ? "markdown mb-5 " : " "
                    }h-full min-h-[inherit] py-2 px-2 rounded overflow-hidden border focus:border-gray-400 border-gray-200 focus-visible:outline-0`,
                },
            },
            onUpdate({ editor }) {
                emit(
                    "update:text",
                    props.tools ? editor.getHTML() : editor.getText()
                );
            },
            onSelectionUpdate({ editor }) {
                checkFormats(editor);
            },
        });
        const actions = computed(() => [
            {
                value: "B",
                type: "bold",
                action: "toggleBold",
                title: "bold",
                active: current.value.bold,
            },
            {
                value: "I",
                type: "italic",
                action: "toggleItalic",
                title: "italic",
                active: current.value.italic,
            },
            {
                value: "S̶",
                type: "strike",
                action: "toggleStrike",
                title: "strike",
                active: current.value.strike,
            },
            {
                value: "¶",
                type: "paragraph",
                action: "setParagraph",
                title: "paragraph",
                active: current.value.paragraph,
            },
            {
                value: "H1",
                type: "heading",
                action: "toggleHeading",
                title: "headingOne",
                active: current.value.heading[0],
                arg: { level: 1 },
            },
            {
                value: "H2",
                type: "heading",
                action: "toggleHeading",
                title: "headingTwo",
                active: current.value.heading[1],
                arg: { level: 2 },
            },
            {
                value: "H3",
                type: "heading",
                action: "toggleHeading",
                title: "headingThird",
                active: current.value.heading[2],
                arg: { level: 3 },
            },
            {
                value: "H4",
                type: "heading",
                action: "toggleHeading",
                title: "headingFourth",
                active: current.value.heading[3],
                arg: { level: 4 },
            },
            {
                value: "H5",
                type: "heading",
                action: "toggleHeading",
                title: "headingFifth",
                active: current.value.heading[4],
                arg: { level: 5 },
            },
            {
                value: "link",
                type: "link",
                title: "Link",
                action: "setLink",
                active: current.value.link,
                extension: true,
                arg: { href: "" },
            },
            {
                value: "clear",
                icon: "pt-times-circle",
                action: "clearNodes",
                title: "clear",
            },
            {
                value: "undo",
                icon: "pt-arrow-left",
                action: "undo",
                title: "undo",
            },
            {
                value: "redo",
                icon: "pt-arrow-right",
                action: "redo",
                title: "redo",
            },
        ]);
        const renderLength = computed(
            () =>
                (
                    editor.value
                        ?.getText()
                        .replace(/(<([^>]+)>)/gi, "")
                        .match(/.*?\w+.*?(\s|$)/gi) || ""
                ).length
        );
        const setText = (action) => {
            if (action.type) {
                if (action.type === "heading") {
                    current.value.heading = arrayCreate(false);
                    current.value.paragraph = false;
                    editor.value.commands.toggleHeading(action.arg);
                    current.value.heading[action.arg.level - 1] =
                        editor.value.isActive(action.type, action.arg);
                } else {
                    if (action.type === "paragraph") {
                        current.value.heading = arrayCreate(false);
                    }
                    if (action.extension) {
                        if (action.type === "link") {
                            const previousUrl =
                                editor.value.getAttributes("link").href;
                            action.arg.href = window.prompt("URL", previousUrl);
                        }
                        editor.value
                            .chain()
                            .focus()
                            .extendMarkRange(action.type)
                            [action.action](action.arg)
                            .run();
                    } else {
                        editor.value.commands[action.action]();
                    }
                    current.value[action.type] = editor.value.isActive(
                        action.type
                    );
                }
            } else if (action.value === "clear") {
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
        const setterActions = computed(() => {
            return {
                format: actions.value.filter((action) => action.type),
                history: actions.value.filter((action) =>
                    /clear|undo|redo/.test(action.value)
                ),
            };
        });
        const checkFormats = (editor) => {
            current.value.link = editor.isActive("link");
            current.value.bold = editor.isActive("bold");
            current.value.italic = editor.isActive("italic");
            current.value.strike = editor.isActive("strike");
            current.value.paragraph = editor.isActive("paragraph");
            current.value.heading.map(
                (_, i) =>
                    (current.value.heading[i] = editor.isActive("heading", {
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
        return {
            editor,
            current,
            actions,
            setText,
            renderLength,
            setterActions,
        };
    },
};
</script>
