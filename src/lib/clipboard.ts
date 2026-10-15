import { notify } from '@/composables/useToasts'

export const copyToClipboard = (text: string, message: string) =>
    navigator.clipboard.writeText(text).then(
        () => notify(message),
        () => notify('Could not copy to the clipboard', 'error')
    )
