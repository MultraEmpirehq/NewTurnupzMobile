import { QueryClient } from "@tanstack/react-query";

// Anything fetched in the last 30 seconds shows straight away without asking
// the server again, kept for 10 minutes after its screen closes. A failed
// request is retried once, not three times, so errors show quickly.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1 }
  }
});
