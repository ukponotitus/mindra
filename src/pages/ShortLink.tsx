import { useEffect } from "react";
import { useParams } from "react-router";
import { API_URL } from "../lib/api";

/**
 * A Mindra short link (/l/<code>) that reached the app instead of the Worker (in development, or before the Worker's
 * script is deployed): send the browser to the API's /l/<code>, which counts the click and sends it on.
 */
export default function ShortLink() {
  const { code = "" } = useParams();
  const target = `${API_URL}/l/${encodeURIComponent(code)}`;
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <p role="status" className="text-sm text-muted-foreground">
        Opening the link…{" "}
        <a href={target} className="font-medium text-primary hover:underline">
          Open it
        </a>
      </p>
    </main>
  );
}
