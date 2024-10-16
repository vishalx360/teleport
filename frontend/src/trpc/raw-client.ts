import { AppRouter } from '@/server/api/root';
import { createTRPCClient, loggerLink, unstable_httpBatchStreamLink } from '@trpc/client';
import SuperJSON from 'superjson';
import { getBaseUrl } from './react';


const client = createTRPCClient<AppRouter>({
    links: [
        loggerLink({
            enabled: (op) =>
                process.env.NODE_ENV === "development" ||
                (op.direction === "down" && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/api/trpc",
            headers: () => {
                const headers = new Headers();
                headers.set("x-trpc-source", "nextjs-react");
                return headers;
            },
        }),
    ],
});

export const rawClient = client;