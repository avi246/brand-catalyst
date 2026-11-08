import type { BrandProfile, InfluencerProfile } from "@/db/schema";

/*
 * The text we turn into an embedding for each profile. Only what describes the CONTENT
 * and AUDIENCE goes in (not numbers like followers or prices; rules handle those).
 * Plain functions with no server imports, so scripts can use them too.
 */

export function creatorText(name: string, p: InfluencerProfile) {
  return [
    `Creator ${name} (@${p.handle}).`,
    `Main niche: ${p.primaryNiche}.`,
    p.secondaryNiches.length ? `Also covers: ${p.secondaryNiches.join(", ")}.` : "",
    p.bio ? `Bio: ${p.bio}` : "",
    p.contentFormats.length ? `Makes: ${p.contentFormats.join(", ")} on ${p.primaryPlatform}.` : `Platform: ${p.primaryPlatform}.`,
    `Based in ${[p.city, p.country].filter(Boolean).join(", ")}.`,
    p.audienceTopCountries.length ? `Audience mainly in ${p.audienceTopCountries.map((c) => c.country).join(", ")}.` : "",
    p.languages.length ? `Languages: ${p.languages.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function brandText(p: BrandProfile) {
  return [
    `Brand ${p.brandName}, ${p.industry}, based in ${p.country}.`,
    p.description ? `About: ${p.description}` : "",
    p.targetAudience ? `Target audience: ${p.targetAudience}.` : "",
    p.preferredNiches.length ? `Looking for creators in: ${p.preferredNiches.join(", ")}.` : "",
    p.campaignGoals.length ? `Goals: ${p.campaignGoals.join(", ")}.` : "",
    p.preferredPlatforms.length ? `Platforms: ${p.preferredPlatforms.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
