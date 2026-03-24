import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Link que usa GET para queries
const getQueryLink = () => {
  return {
    async request(op: any) {
      if (op.type !== "query") {
        return op.next(op);
      }
      const url = new URL("/api/trpc/" + op.path, window.location.origin);
      if (op.input) {
        url.searchParams.set("input", JSON.stringify(op.input));
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
      });
      return { ...op, response };
    },
    merge() {},
  };
};

// Link padrão para mutations (POST)
const mutationLink = httpBatchLink({
  url: "/api/trpc",
  transformer: superjson,
  fetch(input, init) {
    return globalThis.fetch(input, {
      ...(init ?? {}),
      credentials: "include",
    });
  },
});

// Combinar links: query → GET, mutation → POST
const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.type === "query",
      true: getQueryLink(),
      false: mutationLink,
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
