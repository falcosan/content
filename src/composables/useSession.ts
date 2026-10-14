import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { api, parseResponse } from '@/api/client'
import { keys, sessionQuery } from '@/api/queries'
import { sessionExpired } from '@/api/queryClient'

export interface Credentials {
    user: string
    password: string
}

export const useSession = () => useQuery(sessionQuery())

export const useSignIn = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (credentials: Credentials) =>
            parseResponse(api.session.$post({ json: credentials })),
        meta: { silent: true },
        onSuccess: async (session) => {
            queryClient.setQueryData(keys.session, session)
            sessionExpired.value = false
            await queryClient.invalidateQueries({
                predicate: ({ queryKey }) => queryKey[0] !== keys.session[0],
            })
        },
    })
}

export const useSignOut = () => {
    const queryClient = useQueryClient()
    const router = useRouter()
    return useMutation({
        mutationFn: () => parseResponse(api.session.$delete()),
        onSuccess: async () => {
            queryClient.clear()
            await router.replace({ name: 'login' })
        },
    })
}
