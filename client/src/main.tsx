import { lazy, Suspense } from "react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

// Lazy load components for better code splitting
const AppLazy = lazy(() => import("./App"));

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

const extraHeaders: Record<string, string> = {};
if (typeof window !== "undefined") {
  const jti = window.localStorage.getItem("jti");
  if (jti) extraHeaders["x-jti"] = jti;
}

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    splitLink({
      // Mutations devem ser POST (httpLink)
      condition: (params) => {
        return params.op?.type === 'mutation';
      },
      // Para mutations: httpLink (POST garantido)
      true: httpLink({
        url: "/api/trpc",
        headers: () => ({
          ...extraHeaders,
        }),
      }),
      // Para queries: httpBatchLink (GET com batch)
      false: httpBatchLink({
        url: "/api/trpc",
        headers: () => ({
          ...extraHeaders,
        }),
      }),
    }),
  ],
  onError: redirectToLoginIfUnauthorized,
});

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppLazy />
      </QueryClientProvider>
    </trpc.Provider>
  </Suspense>
);
// Deploy trigger: Mon May  4 17:05:20 -03 2026
