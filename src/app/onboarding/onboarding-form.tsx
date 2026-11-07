"use client";

import { useActionState, useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { INDUSTRIES, NICHES, PLATFORMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { completeOnboarding, type OnboardingState } from "./actions";

type Role = "influencer" | "brand";

const ROLE_OPTIONS: { value: Role; title: string; body: string; icon: typeof Sparkles }[] = [
  {
    value: "influencer",
    title: "I'm a creator",
    body: "Get discovered by brands, negotiate fair terms, manage deliverables.",
    icon: Sparkles,
  },
  {
    value: "brand",
    title: "I'm a brand",
    body: "Find creators who fit, send clear briefs, lock agreements both sides trust.",
    icon: Building2,
  },
];

export function OnboardingForm({ suggestedName }: { suggestedName: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-medium">Which describes you?</legend>
        {ROLE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = role === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30",
                selected && "border-primary ring-2 ring-primary/20",
              )}
            >
              <input
                type="radio"
                name="role"
                value={opt.value}
                className="sr-only"
                checked={selected}
                onChange={() => setRole(opt.value)}
              />
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <span className="font-medium">{opt.title}</span>
              <span className="text-sm text-muted-foreground">{opt.body}</span>
            </label>
          );
        })}
      </fieldset>

      {role && (
        <Card>
          <CardHeader>
            <CardTitle>{role === "influencer" ? "Your creator basics" : "Your brand basics"}</CardTitle>
            <CardDescription>
              {role === "influencer"
                ? "Numbers you enter are shown as Self-reported until you verify them."
                : "Creators see this before they accept an invitation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" name="displayName" errors={errors.displayName}>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={suggestedName}
                autoComplete="name"
                required
              />
            </Field>

            {role === "influencer" ? (
              <>
                <Field label="Handle" name="handle" errors={errors.handle} hint="Without the @">
                  <Input id="handle" name="handle" placeholder="glowwithmaya" required />
                </Field>
                <Field label="Main niche" name="primaryNiche" errors={errors.primaryNiche}>
                  <NativeSelect id="primaryNiche" name="primaryNiche" required defaultValue="">
                    <option value="" disabled>
                      Choose a niche
                    </option>
                    {NICHES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Main platform" name="primaryPlatform" errors={errors.primaryPlatform}>
                  <NativeSelect id="primaryPlatform" name="primaryPlatform" required defaultValue="instagram">
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Profile or channel link" name="platformUrl" errors={errors.platformUrl}>
                  <Input
                    id="platformUrl"
                    name="platformUrl"
                    type="url"
                    placeholder="https://instagram.com/glowwithmaya"
                    required
                  />
                </Field>
                <Field label="Followers" name="followers" errors={errors.followers}>
                  <Input id="followers" name="followers" type="number" min={0} inputMode="numeric" required />
                </Field>
                <Field label="City" name="city" errors={errors.city} hint="Optional">
                  <Input id="city" name="city" autoComplete="address-level2" />
                </Field>
                <Field label="Country" name="country" errors={errors.country}>
                  <Input id="country" name="country" autoComplete="country-name" required />
                </Field>
              </>
            ) : (
              <>
                <Field label="Brand name" name="brandName" errors={errors.brandName}>
                  <Input id="brandName" name="brandName" placeholder="Lumen Skincare" required />
                </Field>
                <Field label="Website" name="website" errors={errors.website}>
                  <Input id="website" name="website" type="url" placeholder="https://lumenskin.com" required />
                </Field>
                <Field label="Industry" name="industry" errors={errors.industry}>
                  <NativeSelect id="industry" name="industry" required defaultValue="">
                    <option value="" disabled>
                      Choose an industry
                    </option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Country" name="country" errors={errors.country}>
                  <Input id="country" name="country" autoComplete="country-name" required />
                </Field>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!role || pending}>
          {pending ? "Setting up…" : "Continue to dashboard"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  errors,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {errors?.length ? (
        <p className="text-xs text-destructive">{errors[0]}</p>
      ) : null}
    </div>
  );
}
