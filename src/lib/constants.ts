export const NICHES = [
  "Beauty & Skincare",
  "Fashion",
  "Fitness",
  "Food & Cooking",
  "Travel",
  "Technology",
  "Gaming",
  "Lifestyle",
  "Education",
  "Finance",
  "Parenting",
  "Home & Decor",
  "Health & Wellness",
  "Entertainment",
  "Sustainability",
] as const;

export const INDUSTRIES = [
  "Beauty & Personal Care",
  "Apparel & Accessories",
  "Food & Beverage",
  "Health & Fitness",
  "Consumer Electronics",
  "Software & Apps",
  "Gaming",
  "Travel & Hospitality",
  "Financial Services",
  "Education",
  "Home & Living",
  "Other",
] as const;

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
] as const;

/** Deliverable formats a creator can offer; also the keys of their rate card. */
export const FORMATS = [
  "reel",
  "story",
  "post",
  "carousel",
  "integration",
  "dedicated video",
  "short",
  "video",
  "live",
] as const;

export const AGE_BANDS = ["13-17", "18-24", "25-34", "35+"] as const;

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Other",
};
