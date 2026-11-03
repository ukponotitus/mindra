import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";

// The brand profile (the backend's brands/): who the workspace posts as. One brand per workspace for now.

export type OrganisationType = "business" | "church" | "creator" | "coach" | "nonprofit" | "other";
export type OfferingKind = "product" | "service" | "programme" | "event" | "course" | "other";

export type Offering = { id?: string; kind: OfferingKind; name: string; price: string; description: string; link: string };

export type BrandAsset = { id: string; name: string; url: string | null; thumbnail_url: string | null; width: number | null; height: number | null };

export type BrandProfile = {
  id: string;
  name: string;
  organisation_type: OrganisationType | "";
  about: string;
  location: string;
  website: string;
  whatsapp: string;
  socials: Partial<Record<Social, string>>;
  pillars: string[];
  colours: string[];
  logo: BrandAsset | null;
  photos: BrandAsset[];
  offerings: Offering[];
  audience: string;
  tone: string;
  style_notes: string;
  words_to_use: string;
  words_to_avoid: string;
  sample_posts: string;
  /** The language posts are written in (a code from `useWritingLanguages`). */
  language: string;
  /** What's filled in, for the setup steps. */
  filled: { basics: boolean; offerings: boolean; pillars: boolean; voice: boolean };
  updated_at: string;
};

/** What the app sends to save: the editable fields, with pictures as asset ids. */
export type BrandChanges = Partial<Omit<BrandProfile, "id" | "logo" | "photos" | "filled" | "updated_at">> & {
  logo?: string | null;
  photos?: string[];
};

export type BrandSuggestions = Pick<
  BrandProfile,
  "organisation_type" | "name" | "about" | "audience" | "location" | "website" | "whatsapp" | "tone" | "pillars"
> & { offerings: Omit<Offering, "id" | "link">[] };

export type Social = "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin" | "x";
export const SOCIALS: { id: Social; label: string; placeholder: string }[] = [
  { id: "instagram", label: "Instagram", placeholder: "@yourbrand" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourbrand" },
  { id: "tiktok", label: "TikTok", placeholder: "@yourbrand" },
  { id: "youtube", label: "YouTube", placeholder: "@yourbrand" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/yourbrand" },
  { id: "x", label: "X", placeholder: "@yourbrand" },
];

export const MOST_PILLARS = 8;
export const MOST_COLOURS = 6;

/** Each kind of organisation, with the words and suggestions that fit it. The engine is the same for all. */
export const ORGANISATION_TYPES: {
  id: OrganisationType;
  label: string;
  description: string;
  offeringsTitle: string;
  offeringsHint: string;
  offeringKind: OfferingKind;
  pillars: string[];
}[] = [
  {
    id: "business",
    label: "Small business",
    description: "A shop, brand or service",
    offeringsTitle: "What you sell",
    offeringsHint: "Products and services, with their prices exactly as customers see them.",
    offeringKind: "product",
    pillars: ["Education", "Product", "Customer stories", "Behind the scenes", "Offers"],
  },
  {
    id: "church",
    label: "Church or ministry",
    description: "A church, ministry or fellowship",
    offeringsTitle: "Programmes and events",
    offeringsHint: "Services, programmes and events people can join.",
    offeringKind: "programme",
    pillars: ["Teaching", "Encouragement", "Events", "Testimonies", "Community"],
  },
  {
    id: "creator",
    label: "Creator",
    description: "A podcaster, writer or influencer",
    offeringsTitle: "Your content and offers",
    offeringsHint: "Series, shows, merch or courses you promote.",
    offeringKind: "other",
    pillars: ["Teaching", "Stories", "Behind the scenes", "Community", "Offers"],
  },
  {
    id: "coach",
    label: "Coach or educator",
    description: "A coach, tutor, trainer or school",
    offeringsTitle: "Courses and sessions",
    offeringsHint: "Courses, classes, sessions and programmes, with their prices.",
    offeringKind: "course",
    pillars: ["Tips", "Results", "Questions answered", "Behind the scenes", "Offers"],
  },
  {
    id: "nonprofit",
    label: "Nonprofit or community",
    description: "A charity, NGO or community group",
    offeringsTitle: "Programmes and causes",
    offeringsHint: "Programmes, events and causes people can support.",
    offeringKind: "programme",
    pillars: ["Impact", "Stories", "Events", "How to help", "Community"],
  },
  {
    id: "other",
    label: "Something else",
    description: "Any other organisation",
    offeringsTitle: "What you offer",
    offeringsHint: "Anything you'd like your posts to promote.",
    offeringKind: "other",
    pillars: ["Education", "Stories", "Behind the scenes", "Community"],
  },
];

export const OFFERING_KINDS: { id: OfferingKind; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "service", label: "Service" },
  { id: "programme", label: "Programme" },
  { id: "event", label: "Event" },
  { id: "course", label: "Course" },
  { id: "other", label: "Other" },
];

export function organisationType(id: OrganisationType | "") {
  return ORGANISATION_TYPES.find((type) => type.id === id) ?? ORGANISATION_TYPES[ORGANISATION_TYPES.length - 1];
}

const brandKey = ["brand"];

export function useBrandProfile() {
  return useQuery({ queryKey: brandKey, queryFn: () => apiRequest<BrandProfile>("/api/brand/") });
}

export function useSaveBrandProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: BrandChanges) => apiRequest<BrandProfile>("/api/brand/", { method: "PATCH", body: changes }),
    onSuccess: (profile) => {
      queryClient.setQueryData(brandKey, profile);
      // The writer's default tone comes from the voice, which is part of the profile.
      queryClient.invalidateQueries({ queryKey: ["brand-voice"] });
    },
  });
}

/** Suggestions for the profile from pasted words or a website. Nothing is saved until they're applied. */
export function useFillBrand() {
  return useMutation({
    mutationFn: (source: { text?: string; website?: string }) =>
      apiRequest<BrandSuggestions>("/api/brand/fill/", { method: "POST", body: source }),
  });
}
