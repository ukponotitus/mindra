import { createContext, useContext } from "react";
import type { AuthResponse, User } from "../lib/types";

export type AuthStatus = "loading" | "signedIn" | "signedOut" | "unreachable";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  /** Save the token and user from a login, sign-up or password reset response. */
  signIn: (auth: AuthResponse) => void;
  signOut: () => Promise<void>;
  retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}

/** First name for greetings, falling back to the part of the email before the @. */
export function displayName(user: User): string {
  return user.first_name || user.email.split("@")[0];
}

export function fullName(user: User): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}
