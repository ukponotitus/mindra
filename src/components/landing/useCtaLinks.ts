import { useAuth } from "../../auth/context";

/** Where the landing page buttons go: sign-up and login, or straight to the app for signed-in visitors. */
export function useCtaLinks() {
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  return {
    signedIn,
    startTo: signedIn ? "/dashboard" : "/signup",
    loginTo: signedIn ? "/dashboard" : "/login",
  };
}
