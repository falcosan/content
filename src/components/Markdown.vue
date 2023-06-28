<template>
    <div :class="['flex flex-col', { 'w-full': tools }]">
        <span
            v-if="title"
            class="block mb-5 text-lg font-semibold text-gray-dark"
            v-text="title"
        />
        <div class="flex flex-col">
            <EditorContent
                :class="[
                    'h-full',
                    {
                        'min-w-[2rem] border rounded px-2 focus:border-gray-very-light outline-none ring-0 focus:outline-0 border-gray-soft':
                            editable,
                    },
                    { 'min-h-[2.875rem]': editable && !tools },
                    { 'min-h-[16rem] py-2': editable && tools },
                ]"
                :editor="editor"
            />
            <template v-if="tools && editable">
                <div
                    v-if="editable"
                    class="flex flex-wrap mt-2.5 border rounded shadow justify-between border-gray-very-light"
                >
                    <div>
                        <button
                            v-for="action in setterActions.format"
                            :key="action.tag"
                            :class="[
                                'w-12 border m-1 shadow active:bg-gray-soft border-gray-soft',
                                action.active
                                    ? 'bg-gray'
                                    : 'bg-gray-very-light',
                                { 'font-bold': action.type === 'bold' },
                                { italic: action.type === 'italic' },
                            ]"
                            @click="setText(action)"
                        />
                    </div>
                    <div>
                        <button
                            v-for="action in setterActions.history"
                            :key="action.tag"
                            :class="[
                                'w-12 border m-1 shadow active:bg-gray-soft border-gray-soft bg-gray-very-light',
                            ]"
                            @click="setText(action)"
                        />
                    </div>
                </div>
                <div class="w-full flex items-center justify-end mt-2">
                    <span
                        class="inline-block mr-2 text-xs italic text-gray"
                        v-text="`${t('ui.words')}:`"
                    />
                    <span
                        class="inline-block font-bold text-xs italic text-gray"
                        v-text="renderLength"
                    />
                </div>
            </template>
        </div>
    </div>
</template>
<script>
import StarterKit from "@tiptap/starter-kit";
import { computed, reactive, toRefs, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
export default {
    name: "PtMarkdown",
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
        editable: {
            type: Boolean,
            default: false,
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
                italic: false,
                strike: false,
                paragraph: false,
                heading: arrayCreate(false),
            },
        });
        const { current } = toRefs(state);
        const editor = useEditor({
            content: props.text,
            editable: props.editable,
            enablePasteRules: true,
            extensions: [StarterKit],
            enableCoreExtensions: true,
            editorProps: {
                attributes: {
                    class: `h-full min-h-[inherit] overflow-hidden${
                        props.tools ? "" : " grid items-center"
                    }`,
                },
            },
            onUpdate({ editor }) {
                emit(
                    "update:text",
                    editor[props.tools ? "getHTML" : "getText"]()
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
                    editor.value.commands[action.action]();
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
                if (
                    editor.value[props.tools ? "getHTML" : "getText"]() === val
                ) {
                    return;
                }
                editor.value.commands.setContent(val);
            }
        );
        watch(
            () => props.editable,
            (val) => editor.value.setEditable(val)
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
