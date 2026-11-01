import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "./api";

// Feedback from the form on Home (the backend's feedback/): kept for the team, and emailed to it.

export type Feeling = "great" | "good" | "okay" | "poor";

export const FEELINGS: { id: Feeling; label: string }[] = [
  { id: "great", label: "Very well" },
  { id: "good", label: "Well" },
  { id: "okay", label: "Okay" },
  { id: "poor", label: "Not well" },
];

export function useSendFeedback() {
  return useMutation({
    mutationFn: (feedback: { feeling: Feeling | ""; message: string; page: string }) =>
      apiRequest<{ id: number }>("/api/feedback/", { method: "POST", body: feedback }),
  });
}
