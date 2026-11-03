import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { FontId } from "./studio";

// Graphics and carousel slides drawn by Mindra from its own templates (the backend's studio/graphics.py and
// graphic_posts.py): the words of each slide, written by the AI or by hand, a template, a size and a design, drawn on
// the server into pictures that go on the post as its photos. Keep TEMPLATES, SIZES and LIMITS in step with graphics.py.

export type GraphicTemplate = "quote" | "announcement" | "offer" | "tips" | "carousel";
export type GraphicSize = "4:5" | "9:16" | "1:1";

export type Slide = { label: string; title: string; text: string; photo: string };

export type GraphicDesign = { background: string; accent: string; font: FontId; logo: boolean; footer: string };

export type Graphic = {
  id: string;
  piece: string | null;
  template: GraphicTemplate | "";
  size: GraphicSize;
  design: GraphicDesign;
  slides: Slide[];
  status: "writing" | "rendering" | "ready" | "failed";
  /** Why it failed, or why its pictures couldn't go on the post; or "". */
  error: string;
  revision: number;
  images: { id: string; url: string; thumbnail_url: string }[];
  /** Being written or drawn on the server (it carries on if the page is closed). */
  working: boolean;
};

/** What each template is, and what its words are for (label, title, text). */
export const TEMPLATES: {
  id: GraphicTemplate;
  label: string;
  hint: string;
  fields: { label: string; title: string; text: string };
}[] = [
  {
    id: "quote",
    label: "Quote card",
    hint: "A line worth sharing, with who said it.",
    fields: { label: "Heading (optional)", title: "The quote", text: "Who said it" },
  },
  {
    id: "announcement",
    label: "Announcement or event",
    hint: "What's happening, with the details on their own lines.",
    fields: { label: "Tag, such as Save the date", title: "What's happening", text: "Details, one per line" },
  },
  {
    id: "offer",
    label: "Offer or product",
    hint: "A product or service, its price and how to get it.",
    fields: { label: "Price or offer", title: "Name", text: "Why it's worth having" },
  },
  {
    id: "tips",
    label: "Tip or list",
    hint: "A numbered list, one item per line.",
    fields: { label: "Heading, such as 3 tips", title: "What it's about", text: "Items, one per line" },
  },
  {
    id: "carousel",
    label: "Carousel slides",
    hint: "A cover, one point a slide, and a call to action last.",
    fields: { label: "Small label (optional)", title: "Title", text: "Text" },
  },
];

export const SIZES: { id: GraphicSize; label: string }[] = [
  { id: "4:5", label: "Feed (4:5)" },
  { id: "9:16", label: "Status and Stories (9:16)" },
  { id: "1:1", label: "Square (1:1)" },
];

export const LIMITS = { label: 40, title: 160, text: 400, footer: 60 };
export const MOST_SLIDES = 10;
/** Background choices besides the brand's colours. */
export const LIGHT = "#F7F4EE";
export const DARK = "#15181D";

export function templateInfo(id: GraphicTemplate | "") {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
}

const listKey = (pieceId: string) => ["graphics", pieceId];

/** A post's graphics, newest first, checked every few seconds while one is written or drawn. */
export function usePostGraphics(pieceId: string | null) {
  return useQuery({
    queryKey: listKey(pieceId ?? ""),
    queryFn: () => apiRequest<Graphic[]>(`/api/studio/graphics/?piece=${pieceId}`),
    enabled: Boolean(pieceId),
    refetchInterval: (query) => (query.state.data?.some((graphic) => graphic.working) ? 2000 : false),
  });
}

function useGraphicChanged() {
  const queryClient = useQueryClient();
  return (graphic: Graphic) => {
    if (graphic.piece) {
      queryClient.setQueryData<Graphic[]>(listKey(graphic.piece), (list) => [graphic, ...(list ?? []).filter((item) => item.id !== graphic.id)]);
    }
    // Its pictures go on the post, and show in the uploads.
    queryClient.invalidateQueries({ queryKey: ["content"] });
    queryClient.invalidateQueries({ queryKey: ["studio-queue"] });
    queryClient.invalidateQueries({ queryKey: ["studio", "assets"] });
  };
}

/** Make a graphic for a post: its words written by the AI when `slides` isn't given. */
export function useMakeGraphic() {
  const changed = useGraphicChanged();
  return useMutation({
    mutationFn: (body: { piece: string; template?: GraphicTemplate | null; size?: GraphicSize; design?: Partial<GraphicDesign>; slides?: Slide[] }) =>
      apiRequest<Graphic>("/api/studio/graphics/", { method: "POST", body }),
    onSuccess: changed,
  });
}

/** Save changes and draw it again. */
export function useChangeGraphic() {
  const changed = useGraphicChanged();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; template: GraphicTemplate; size: GraphicSize; design: GraphicDesign; slides: Slide[]; revision: number }) =>
      apiRequest<Graphic>(`/api/studio/graphics/${id}/`, { method: "PUT", body }),
    onSuccess: changed,
  });
}

/** Have the AI write the words again (in another template, if given). */
export function useWriteGraphic() {
  const changed = useGraphicChanged();
  return useMutation({
    mutationFn: ({ id, template }: { id: string; template?: GraphicTemplate }) =>
      apiRequest<Graphic>(`/api/studio/graphics/${id}/write/`, { method: "POST", body: { template: template ?? null } }),
    onSuccess: changed,
  });
}
