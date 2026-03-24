import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, splitLink } from "@trpc/client";
import type { TRPCLink, AppRouter } from "@trpc/server";

export const trpc = createTRPCReact<AppRouter>();

// Link que usa GET para queries
const getQueryLink: TRPCLink<AppRouter> = () => {
  return {
    async request(op) {
      // Se não for query, repassar para o próximo link
      if (op.type !== "query") {
        return op.next(op);
      }
      // Construir URL com input como query string
      const url = new URL("/api/trpc/" + op.path, window.location.origin);
      if (op.input) {
        url.searchParams.set("input", JSON.stringify(op.input));
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "same-origin",
      });
      return { ...op, response };
    },
    merge() {
      // não necessário para GET
    },
  };
};

// Link padrão para mutations (POST) — usa batch
const mutationLink = httpBatchLink({
  url: "/api/trpc",
  fetch: (url, options) => {
    // Garantir que cookies sejam enviados
    options.credentials = "same-origin";
    return fetch(url, options);
  },
});

// Link combinado: query vai por GET, mutation por POST
const combinedLink = splitLink({
  condition: (op) => op.type === "query",
  true: getQueryLink(),
  false: mutationLink,
});

// Cliente tRPC customizado
export const trpcClient = trpc.createClient({
  links: [combinedLink],
});
