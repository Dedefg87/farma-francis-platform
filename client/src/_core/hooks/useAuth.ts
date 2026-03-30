import { trpc } from "@/lib/trpc";

export function useAuth() {
  // Verificar se há token
  const hasToken = !!localStorage.getItem("authToken") || document.cookie.includes("session=");

  // Query desabilitada até que haja token
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken, // ⭐ SÓ RODA SE HOUVER TOKEN
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("authToken");
      document.cookie = "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = "/login";
    },
  });

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: !!meQuery.data && hasToken,
    logout: logoutMutation.mutate,
  };
}
