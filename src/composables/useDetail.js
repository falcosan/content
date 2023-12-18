import enums from '@/enums'
import { formatString } from '@/utils/string'
import { dateWithoutHour } from '@/utils/date'
import { watch, toRefs, inject, reactive, computed, onMounted, onUnmounted } from 'vue'
import { editStoryblokStory, toggleStoryblokStory, getStoryblokComponents } from '@/api'

export const useDetail = (props) => {
    const locale = inject('locale')
    const state = reactive({
        detail: {},
        properties: {
            datetime: [],
            markdown: [],
            required: [],
            maxLength: [],
            translatable: [],
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
    const html = /^<([a-z]+)([^>]+)*(?:>(?:\s*|\n*)<\/\1>|[^/]*\/>)$/
    const translatable = computed(() =>
        properties.value.translatable.reduce((acc, value) => {
            const regex = new RegExp(`${enums.translatableSuffix}.*`)
            const key = value.replace(regex, '')
            const obj = enums.languages.reduce((objAcc, lang) => {
                const translatedKey = `${key}${enums.translatableSuffix}${lang}`
                const text = lang === 'en' ? key : translatedKey
                return { ...objAcc, [lang]: text }
            }, {})
            return { ...acc, [key]: obj[locale.value] }
        }, {})
    )
    const inputs = computed(() => [
        ...properties.value.datetime.map((key) => ({
            title: `${formatString(key)}${properties.value.required.includes(key) ? '*' : ''}`,
            value: key,
            type: 'date',
        })),
    ])
    const editors = computed(() => [
        ...properties.value.translatable.map((key) => ({
            title: `${formatString(properties.value.translatable.find((val) => val === key))}${
                properties.value.required.includes(key) ? '*' : ''
            }`,
            value: translatable.value[key],
            max: checkProperties('maxLength', key),
            markdown: checkProperties('markdown', key),
        })),
    ])
    const resetModal = () => {
        clearTimeout(modal.value.timeout)
        modal.value.timeout = setTimeout(() => {
            modal.value.message = ''
            modal.value.state = false
            modal.value.type = ''
        }, 5000)
    }
    const mapDetail = (values) => {
        const translatables = properties.value.translatable.reduce((acc, value) => {
            const regex = new RegExp(`${enums.translatableSuffix}.*`)
            const key = value.replace(regex, '')
            return enums.languages.reduce((objAcc, lang) => {
                const translatedKey = `${key}${enums.translatableSuffix}${lang}`
                const text = lang === 'en' ? key : translatedKey
                const value = values.content[text] || ''
                return {
                    ...acc,
                    ...objAcc,
                    [text]: value,
                }
            }, {})
        }, {})
        const content = Object.entries(values.content).reduce((acc, [k, v]) => {
            if (k === 'date') acc[k] = new Date(v).toISOString().slice(0, 10)
            else acc[k] = v
            return acc
        }, {})
        return { ...values, content: { ...content, ...translatables } }
    }
    const cleanDetail = (values) => {
        const keys = properties.value.translatable.reduce((acc, curr) => {
            const transformed = enums.languages
                .filter((lang) => lang !== 'en')
                .map((lang) => `${curr}${enums.translatableSuffix}${lang}`)
            return [...acc, ...transformed]
        }, [])
        const content = Object.keys(values.content).reduce((fields, key) => {
            const value = values.content[key]
            if (!value) return fields
            if (
                (keys.includes(key) && !html.test(value)) ||
                (!keys.includes(key) && !html.test(value))
            ) {
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
        const check = properties.value.required.every((prop) => {
            return detail.value.content[prop] && !html.test(detail.value.content[prop])
        })
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
        let domain
        const slug = detail.value.slug
        const language = locale.value === 'en' ? '' : `${locale.value}/`
        if (detail.value.published) domain = import.meta.env.STORY_DOMAIN_PRO
        else domain = import.meta.env.STORY_DOMAIN_DEV
        window.open(`${domain}${language}blog/${slug}`, '_blank', 'noopener,noreferrer')
    }
    const editDetail = async () => {
        loading.value.edit = true
        try {
            checkDetail()
            await editStoryblokStory(cleanDetail(detail.value), locale.value)
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
    onMounted(() => window.addEventListener('keydown', handleSave))
    onUnmounted(() => window.removeEventListener('keydown', handleSave))
    watch(
        props.data,
        async (val) => {
            if (val.content) {
                const data = await getStoryblokComponents(val.content.component, [
                    'required',
                    'translatable',
                    { max_length: [String, Number] },
                    { type: ['markdown', 'datetime'] },
                ])
                const getKeys = (list, type) => {
                    if (list?.length) {
                        const mapper = (arr) => arr.map((val) => val[0])
                        if (type) return mapper(list.filter((value) => value.includes(type)))
                        else return mapper(list)
                    }
                }
                const getObj = (list, type) => {
                    if (list?.length) {
                        const mapper = (arr) => arr.map((val) => ({ [val[0]]: val[1] }))
                        if (type) return mapper(list.filter((value) => value.includes(type)))
                        else return mapper(list)
                    }
                }
                properties.value.required = getKeys(data.required)
                properties.value.maxLength = getObj(data.max_length)
                properties.value.markdown = getKeys(data.type, 'markdown')
                properties.value.datetime = getKeys(data.type, 'datetime')
                properties.value.translatable = getKeys(data.translatable)
                detail.value = mapDetail(val)
            }
        },
        { immediate: true }
    )
    return {
        modal,
        detail,
        locale,
        inputs,
        editors,
        loading,
        modalType,
        editDetail,
        properties,
        goToDetail,
        toggleDetail,
        translatable,
        checkProperties,
    }
}
