import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest, getToken, onUnauthorized, setToken } from "../lib/api";
import { turnOffPush } from "../lib/notifications";
import type { AuthResponse, User } from "../lib/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./context";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState(getToken);

  const {
    data: user,
    error,
    refetch,
  } = useQuery({
    queryKey: ["me", token],
    queryFn: () => apiRequest<User>("/api/auth/me/"),
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const forget = useCallback(() => {
    setToken(null);
    setTokenState(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => onUnauthorized(forget), [forget]);

  const signIn = useCallback(
    (auth: AuthResponse) => {
      queryClient.clear();
      setToken(auth.token);
      queryClient.setQueryData(["me", auth.token], auth.user);
      setTokenState(auth.token);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    // Stop this device's reminders for this account first, while the request can still be signed. A slow or missing
    // service worker never holds up signing out.
    await Promise.race([turnOffPush().catch(() => undefined), new Promise((done) => window.setTimeout(done, 3000))]);
    try {
      await apiRequest<null>("/api/auth/logout/", { method: "POST" });
    } catch {
      // Signing out locally is what matters; the server token expires with the account anyway.
    }
    forget();
  }, [forget]);

  let status: AuthStatus = "loading";
  if (!token) status = "signedOut";
  else if (user) status = "signedIn";
  else if (error) status = error instanceof ApiError && error.status === 401 ? "signedOut" : "unreachable";

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: user ?? null, signIn, signOut, retry: () => void refetch() }),
    [status, user, refetch, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
