import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'
import { notify } from '@/composables/useToasts'
import { errorMessage, statusOf } from './client'
import { keys } from './queries'

export const sessionExpired = ref(false)

const isUnauthorized = (error: unknown) => statusOf(error) === 401

const isRetryable = (error: unknown) => {
    const status = statusOf(error)
    return status === undefined || status === 429 || status >= 500
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error, query) => {
            if (isUnauthorized(error) && query.queryKey[0] !== keys.session[0]) {
                sessionExpired.value = true
            }
        },
    }),
    mutationCache: new MutationCache({
        onError: (error, _variables, _result, mutation) => {
            if (mutation.meta?.silent) return
            if (isUnauthorized(error)) sessionExpired.value = true
            else notify(errorMessage(error), 'error')
        },
    }),
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
        },
    },
})
