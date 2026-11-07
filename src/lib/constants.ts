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

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Other",
};
