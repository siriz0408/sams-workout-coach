/**
 * React Query Client Configuration
 * Handles server state management with proper defaults
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,

      // Cache time: How long unused data stays in cache (10 minutes)
      gcTime: 10 * 60 * 1000,

      // Retry failed queries automatically (up to 3 times)
      retry: 3,

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for returning to app)
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});
