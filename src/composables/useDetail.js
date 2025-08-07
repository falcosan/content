import { formatString } from '@/utils/string'
import { watch, toRefs, reactive, computed, onMounted, onUnmounted } from 'vue'
import { editStoryblokStory, toggleStoryblokStory, getStoryblokComponents } from '@/api'

export const useDetail = (props, emits) => {
    const state = reactive({
        detail: {},
        properties: {
            datetime: [],
            markdown: [],
            required: [],
            maxLength: [],
            textFields: [],
        },
        loading: {
            edit: false,
            toggle: false,
        },
        keys: { ctrl: false },
        modal: { state: false, message: '', type: '', timeout: 0 },
    })
    const { detail, keys, modal, loading, properties } = toRefs(state)
    const modalType = {
        error: { background: 'bg-red-500', text: 'text-white' },
        edited: { background: 'bg-blue-500', text: 'text-white' },
        published: { background: 'bg-green-500', text: 'text-white' },
    }
    const fields = ['date', 'title', 'intro', 'long_text']
    const html = /^<([a-z]+)([^>]+)*(?:>(?:\s*|\n*)<\/\1>|[^/]*\/>)$/

    const inputs = computed(() => [
        ...properties.value.datetime.map((key) => ({
            title: `${formatString(key)}${properties.value.required.includes(key) ? '*' : ''}`,
            value: key,
            type: 'date',
        })),
    ])
    const editors = computed(() => {
        const sortedFields = properties.value.textFields.sort((a, b) => {
            const indexA = fields.indexOf(a)
            const indexB = fields.indexOf(b)
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB
            }

            if (indexA !== -1) return -1
            if (indexB !== -1) return 1
            return 0
        })

        return sortedFields.map((key) => ({
            title: `${formatString(key)}${properties.value.required.includes(key) ? '*' : ''}`,
            value: key,
            max: checkProperties('maxLength', key),
            markdown: checkProperties('markdown', key),
        }))
    })
    const resetModal = () => {
        clearTimeout(modal.value.timeout)
        modal.value.timeout = setTimeout(() => {
            modal.value.message = ''
            modal.value.state = false
            modal.value.type = ''
        }, 5000)
    }
    const mapDetail = (values) => {
        const content = Object.entries(values.content).reduce((acc, [k, v]) => {
            if (k === 'date') acc[k] = new Date(v).toISOString().slice(0, 10)
            else acc[k] = v
            return acc
        }, {})
        return { ...values, content }
    }
    const cleanDetail = (values) => {
        const content = Object.keys(values.content).reduce((fields, key) => {
            const value = values.content[key]
            if (!value) return fields
            if (!html.test(value)) {
                return { ...fields, [key]: value }
            }
            return fields
        }, {})
        return { ...values, content }
    }
    const checkProperties = (prop, value) => {
        const property = properties.value[prop]
        if (property?.length) {
            if (property.every((item) => typeof item === 'object')) {
                const found = property.find((item) => item[value])
                if (found) return found[value]
                else return null
            } else {
                return property.includes(value)
            }
        }
    }
    const checkDetail = () => {
        const check = properties.value.required.every(
            (prop) => detail.value.content[prop] && !html.test(detail.value.content[prop])
        )
        if (!check) {
            const message = 'Complete required fields'
            clearTimeout(modal.value.timeout)
            modal.value.message = message
            modal.value.state = true
            modal.value.type = 'error'
            resetModal()
            throw new Error(message)
        }
    }
    const goToDetail = () => {
        const slug = detail.value.full_slug
        const domain = import.meta.env['STORY_DOMAIN_PRO']
        window.open(`${domain}${slug}`, '_blank', 'noopener,noreferrer')
    }
    const editDetail = async () => {
        loading.value.edit = true
        try {
            checkDetail()
            await editStoryblokStory(cleanDetail(detail.value))
                .then((res) => {
                    detail.value = mapDetail(res.story)
                    modal.value.message = 'Saved'
                    modal.value.state = true
                    modal.value.type = 'edited'
                })
                .catch((err) => {
                    console.error(err)
                    modal.value.message = 'Error'
                    modal.value.state = true
                    modal.value.type = 'error'
                })
                .finally(() => {
                    resetModal()
                    loading.value.edit = false
                })
        } catch {
            loading.value.edit = false
        }
    }
    const toggleDetail = async () => {
        loading.value.toggle = true
        const state = detail.value.published ? 'unpublish' : 'publish'
        try {
            checkDetail()
            await toggleStoryblokStory(detail.value.id, state)
                .then((res) => {
                    detail.value = mapDetail(res.story)
                    modal.value.message = detail.value.published ? 'Published' : 'Unpublished'
                    modal.value.state = true
                    modal.value.type = detail.value.published ? 'published' : 'error'
                })
                .catch(() => {
                    modal.value.message = 'Error'
                    modal.value.state = true
                    modal.value.type = 'error'
                })
                .finally(() => {
                    resetModal()
                    loading.value.toggle = false
                })
        } catch {
            loading.value.toggle = false
        }
    }
    const handleSave = async (event) => {
        if (event.metaKey && event.code === 'KeyS') {
            event.preventDefault()
            await editDetail()
        } else {
            if (event.keyCode == 17) {
                event.preventDefault()
                keys.value.ctrl = true
            }
            if (event.keyCode == 83 && keys.value.ctrl) {
                event.preventDefault()
                await editDetail()
                keys.value.ctrl = false
            }
        }
    }
    const getProperties = (list, setter, type) => {
        if (list?.length) {
            const mapper = (arr) =>
                arr.map((val) => (setter === 'key' ? val[0] : { [val[0]]: val[1] }))
            if (type) return mapper(list.filter((value) => value.includes(type)))
            else return mapper(list)
        }
    }
    onMounted(() => window.addEventListener('keydown', handleSave))
    onUnmounted(() => window.removeEventListener('keydown', handleSave))
    watch(
        () => props.data,
        async (val) => {
            if (val.content) {
                const data = await getStoryblokComponents(val.content.component, [
                    'required',
                    { max_length: [String, Number] },
                    { type: ['markdown', 'datetime'] },
                ])
                properties.value.required = getProperties(data.required, 'key')
                properties.value.maxLength = getProperties(data.max_length, 'obj')
                properties.value.markdown = getProperties(data.type, 'key', 'markdown')
                properties.value.datetime = getProperties(data.type, 'key', 'datetime')
                properties.value.textFields = Object.keys(val.content || {}).filter(
                    (key) =>
                        typeof val.content[key] === 'string' &&
                        !properties.value.datetime.includes(key) &&
                        fields.includes(key)
                )
                detail.value = mapDetail(val)
                emits('ready', true)
            }
        }
    )
    return {
        modal,
        detail,
        inputs,
        editors,
        loading,
        modalType,
        editDetail,
        properties,
        goToDetail,
        toggleDetail,
        checkProperties,
    }
}
