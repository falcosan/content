import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { api, parseResponse } from '@/api/client'
import { keys } from '@/api/queries'
import { notify } from './useToasts'

export const useAddOption = (key: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        scope: { id: 'schema' },
        mutationFn: (name: string) =>
            parseResponse(
                api.schema.fields[':key'].options.$post({ param: { key }, json: { name } })
            ),
        onSuccess: async ({ option, created }) => {
            await queryClient.invalidateQueries({ queryKey: keys.fields })
            if (created) notify(`“${option.name}” added`)
        },
    })
}
