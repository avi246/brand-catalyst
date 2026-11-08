"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckboxChips, Field } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfile, InfluencerProfile, SocialAccount, User } from "@/db/schema";
import { AGE_BANDS, COMPANY_SIZES, FORMATS, INDUSTRIES, NICHES, PLATFORM_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateProfile, type EditState } from "./actions";

type Props =
  | { kind: "influencer"; user: User; profile: InfluencerProfile; account: SocialAccount | null }
  | { kind: "brand"; user: User; profile: BrandProfile };

export function EditProfileForm(props: Props) {
  const [state, action, pending] = useActionState<EditState, FormData>(updateProfile, {});
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      {props.kind === "influencer" ? <InfluencerFields {...props} e={e} /> : <BrandFields {...props} e={e} />}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Link href="/profile" className={cn(buttonVariants({ variant: "ghost" }))}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

type Errors = Record<string, string[] | undefined>;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function InfluencerFields({
  user,
  profile: p,
  account,
  e,
}: {
  user: User;
  profile: InfluencerProfile;
  account: SocialAccount | null;
  e: Errors;
}) {
  const verified = account && account.source !== "self";
  return (
    <>
      <Section title="Basics">
        <Field label="Name" name="displayName" errors={e.displayName}>
          <Input id="displayName" name="displayName" defaultValue={user.displayName} required />
        </Field>
        <Field label="Main niche" name="primaryNiche" errors={e.primaryNiche}>
          <NativeSelect id="primaryNiche" name="primaryNiche" defaultValue={p.primaryNiche}>
            {NICHES.map((n) => <option key={n}>{n}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Bio" name="bio" errors={e.bio} hint="What you make, for whom" className="sm:col-span-2">
          <Textarea id="bio" name="bio" defaultValue={p.bio ?? ""} maxLength={600} rows={3} />
        </Field>
        <Field label="Other niches" name="secondaryNiches" errors={e.secondaryNiches} hint="Up to 3" className="sm:col-span-2">
          <CheckboxChips name="secondaryNiches" options={NICHES} defaultValues={p.secondaryNiches} />
        </Field>
        <Field label="City" name="city" errors={e.city}>
          <Input id="city" name="city" defaultValue={p.city ?? ""} />
        </Field>
        <Field label="Country" name="country" errors={e.country}>
          <Input id="country" name="country" defaultValue={p.country} required />
        </Field>
        <Field label="Languages" name="languages" hint="Comma separated">
          <Input id="languages" name="languages" defaultValue={p.languages.join(", ")} placeholder="English, Spanish" />
        </Field>
        <Field label="Availability" name="availability" errors={e.availability}>
          <Input id="availability" name="availability" defaultValue={p.availability ?? ""} placeholder="Booking 2 weeks out" />
        </Field>
      </Section>

      <Section
        title={`${PLATFORM_LABEL[p.primaryPlatform]} stats`}
        description={
          verified
            ? "These numbers are verified from the platform and can't be edited."
            : "Self-reported. Brands see a Self-reported badge next to them until you verify."
        }
      >
        <Field label="Followers" name="followers" errors={e.followers}>
          <Input id="followers" name="followers" type="number" min={0} defaultValue={account?.followers ?? ""} disabled={!!verified} />
        </Field>
        <Field label="Average views per post" name="avgViews" errors={e.avgViews}>
          <Input id="avgViews" name="avgViews" type="number" min={0} defaultValue={account?.avgViews ?? ""} disabled={!!verified} />
        </Field>
        <Field label="Engagement rate (%)" name="engagementRate" errors={e.engagementRate}>
          <Input
            id="engagementRate"
            name="engagementRate"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={account?.engagementRate ?? ""}
            disabled={!!verified}
          />
        </Field>
      </Section>

      <Section title="Content and rates" description="Leave a rate empty if you don't offer that format.">
        <Field label="Formats you make" name="contentFormats" className="sm:col-span-2">
          <CheckboxChips name="contentFormats" options={FORMATS} defaultValues={p.contentFormats} />
        </Field>
        {FORMATS.map((f) => (
          <Field key={f} label={`Rate: ${f}`} name={`rate:${f}`} hint="USD">
            <Input id={`rate:${f}`} name={`rate:${f}`} type="number" min={0} defaultValue={p.rateCard[f] ?? ""} />
          </Field>
        ))}
        <Field label="Past brand collaborations" name="pastBrands" hint="Comma separated" className="sm:col-span-2">
          <Input id="pastBrands" name="pastBrands" defaultValue={p.pastBrands.join(", ")} />
        </Field>
      </Section>

      <Section title="Audience" description="From your platform's insights. Shares are percentages of your audience.">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem] gap-2 sm:col-span-2">
            <Field label={`Top country ${i + 1}`} name={`audCountry${i + 1}`}>
              <Input
                id={`audCountry${i + 1}`}
                name={`audCountry${i + 1}`}
                defaultValue={p.audienceTopCountries[i]?.country ?? ""}
                placeholder="US"
              />
            </Field>
            <Field label="Share %" name={`audPct${i + 1}`}>
              <Input
                id={`audPct${i + 1}`}
                name={`audPct${i + 1}`}
                type="number"
                min={0}
                max={100}
                defaultValue={p.audienceTopCountries[i]?.pct ?? ""}
              />
            </Field>
          </div>
        ))}
        {e.audienceTopCountries && <p className="text-xs text-destructive sm:col-span-2">{e.audienceTopCountries[0]}</p>}
        {AGE_BANDS.map((band) => (
          <Field key={band} label={`Age ${band} (%)`} name={`age:${band}`}>
            <Input
              id={`age:${band}`}
              name={`age:${band}`}
              type="number"
              min={0}
              max={100}
              defaultValue={p.audienceAgeBands.find((a) => a.band === band)?.pct ?? ""}
            />
          </Field>
        ))}
        {e.audienceAgeBands && <p className="text-xs text-destructive sm:col-span-2">{e.audienceAgeBands[0]}</p>}
      </Section>
    </>
  );
}

function BrandFields({ user, profile: p, e }: { user: User; profile: BrandProfile; e: Errors }) {
  return (
    <>
      <Section title="Brand basics">
        <Field label="Your name" name="displayName" errors={e.displayName}>
          <Input id="displayName" name="displayName" defaultValue={user.displayName} required />
        </Field>
        <Field label="Brand name" name="brandName" errors={e.brandName}>
          <Input id="brandName" name="brandName" defaultValue={p.brandName} required />
        </Field>
        <Field label="Company (legal) name" name="companyName" errors={e.companyName} hint="Optional">
          <Input id="companyName" name="companyName" defaultValue={p.companyName ?? ""} />
        </Field>
        <Field label="Website" name="website" errors={e.website}>
          <Input id="website" name="website" type="url" defaultValue={p.website} required />
        </Field>
        <Field label="Industry" name="industry" errors={e.industry}>
          <NativeSelect id="industry" name="industry" defaultValue={p.industry}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Company size" name="companySize">
          <NativeSelect id="companySize" name="companySize" defaultValue={p.companySize ?? ""}>
            <option value="">Prefer not to say</option>
            {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
          </NativeSelect>
        </Field>
        <Field label="Country" name="country" errors={e.country}>
          <Input id="country" name="country" defaultValue={p.country} required />
        </Field>
        <Field label="Markets you sell in" name="markets" hint="Comma separated">
          <Input id="markets" name="markets" defaultValue={p.markets.join(", ")} placeholder="US, Canada" />
        </Field>
        <Field label="Description" name="description" errors={e.description} className="sm:col-span-2">
          <Textarea id="description" name="description" defaultValue={p.description ?? ""} maxLength={800} rows={3} />
        </Field>
        <Field label="Logo image link" name="logoUrl" errors={e.logoUrl} hint="Uploads come later" className="sm:col-span-2">
          <Input id="logoUrl" name="logoUrl" type="url" defaultValue={p.logoUrl ?? ""} placeholder="https://…/logo.png" />
        </Field>
      </Section>

      <Section title="What you look for" description="Used to rank creators for you in Discover.">
        <Field label="Preferred creator niches" name="preferredNiches" className="sm:col-span-2">
          <CheckboxChips name="preferredNiches" options={NICHES} defaultValues={p.preferredNiches} />
        </Field>
        <Field label="Preferred platforms" name="preferredPlatforms" className="sm:col-span-2">
          <CheckboxChips
            name="preferredPlatforms"
            options={["instagram", "youtube", "tiktok"]}
            defaultValues={p.preferredPlatforms}
            labels={PLATFORM_LABEL}
          />
        </Field>
        <Field label="Target audience" name="targetAudience" errors={e.targetAudience} className="sm:col-span-2">
          <Input id="targetAudience" name="targetAudience" defaultValue={p.targetAudience ?? ""} placeholder="US college students, 18-24" />
        </Field>
        <Field label="Campaign goals" name="campaignGoals" hint="Comma separated" className="sm:col-span-2">
          <Input id="campaignGoals" name="campaignGoals" defaultValue={p.campaignGoals.join(", ")} placeholder="Product launch, Sales" />
        </Field>
      </Section>

      <Section title="Budget and payment" description="Creators see this before they accept your invitation.">
        <Field label="Typical budget from (USD)" name="budgetMin" errors={e.budgetMin}>
          <Input id="budgetMin" name="budgetMin" type="number" min={0} defaultValue={p.budgetMin ?? ""} />
        </Field>
        <Field label="Typical budget to (USD)" name="budgetMax" errors={e.budgetMax}>
          <Input id="budgetMax" name="budgetMax" type="number" min={0} defaultValue={p.budgetMax ?? ""} />
        </Field>
        <Field label="Usual payment terms" name="paymentTerms" errors={e.paymentTerms} className="sm:col-span-2">
          <Input id="paymentTerms" name="paymentTerms" defaultValue={p.paymentTerms ?? ""} placeholder="50% upfront, 50% on publish" />
        </Field>
      </Section>
    </>
  );
}
