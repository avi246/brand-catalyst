import { ExternalLink, Globe, MapPin } from "lucide-react";
import { StatSourceBadge } from "@/components/stat-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABEL } from "@/lib/constants";
import type { ProfileBundle } from "@/lib/profiles";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** The About page. Same component for "my profile" and for what the other side sees. */
export function ProfileView({ bundle }: { bundle: ProfileBundle }) {
  const { user } = bundle;

  if (bundle.kind === "influencer") {
    const p = bundle.profile;
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{user.displayName}</h2>
                <span className="text-muted-foreground">@{p.handle}</span>
                {user.isDemo && <Badge variant="outline">Demo data</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {[p.city, p.country].filter(Boolean).join(", ")}
                </span>
                <span>{PLATFORM_LABEL[p.primaryPlatform]} creator</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge>{p.primaryNiche}</Badge>
                {p.secondaryNiches.map((n) => (
                  <Badge key={n} variant="secondary">
                    {n}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {p.bio || "No bio yet."}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {Object.keys(p.rateCard).length ? (
                <ul className="flex flex-col gap-1.5">
                  {Object.entries(p.rateCard).map(([format, price]) => (
                    <li key={format} className="flex justify-between">
                      <span className="capitalize text-muted-foreground">{format}</span>
                      <span className="font-medium tabular-nums">
                        {price.toLocaleString("en", { style: "currency", currency: p.currency, maximumFractionDigits: 0 })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">Rates on request.</span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {bundle.accounts.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-medium hover:underline"
                  >
                    {PLATFORM_LABEL[a.platform]} · @{a.handle}
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                  <StatSourceBadge source={a.source} syncedAt={a.verifiedAt} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <Stat label="Followers" value={a.followers} />
                  <Stat label="Avg views" value={a.avgViews} />
                  <Stat
                    label="Engagement"
                    value={a.engagementRate != null ? `${a.engagementRate}%` : null}
                  />
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Audience</CardTitle>
              <StatSourceBadge source="self" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5 text-sm">
              {p.audienceTopCountries.length || p.audienceAgeBands.length ? (
                <>
                  <BarList title="Top countries" rows={p.audienceTopCountries.map((c) => ({ label: c.country, pct: c.pct }))} />
                  <BarList title="Age" rows={p.audienceAgeBands.map((a) => ({ label: a.band, pct: a.pct }))} />
                </>
              ) : (
                <span className="text-muted-foreground">Audience details not shared yet.</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                <Row label="Content formats">
                  {p.contentFormats.length ? <span className="capitalize">{p.contentFormats.join(", ")}</span> : "Not shared"}
                </Row>
                <Row label="Languages">{p.languages.length ? p.languages.join(", ") : "Not shared"}</Row>
                <Row label="Availability">{p.availability ?? "Not shared"}</Row>
                <Row label="Past collaborations">{p.pastBrands.length ? p.pastBrands.join(", ") : "None listed"}</Row>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const p = bundle.profile;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-16 rounded-xl">
            {p.logoUrl && <AvatarImage src={p.logoUrl} alt="" />}
            <AvatarFallback className="rounded-xl">{initials(p.brandName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{p.brandName}</h2>
              {user.isDemo && <Badge variant="outline">Demo data</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{p.industry}</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {p.country}
              </span>
              <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <Globe className="size-3.5" />
                {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {p.description || "No description yet."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Working with us</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Typical budget">
                {p.budgetMin != null || p.budgetMax != null
                  ? `${p.budgetMin ?? "?"}–${p.budgetMax ?? "?"} ${p.currency}`
                  : "Not shared"}
              </Row>
              <Row label="Payment terms">{p.paymentTerms ?? "Not shared"}</Row>
              <Row label="Looking for">
                {p.preferredNiches.length ? p.preferredNiches.join(", ") : "Not shared"}
              </Row>
              <Row label="Platforms">
                {p.preferredPlatforms.length
                  ? p.preferredPlatforms.map((x) => PLATFORM_LABEL[x] ?? x).join(", ")
                  : "Not shared"}
              </Row>
              <Row label="Target audience">{p.targetAudience ?? "Not shared"}</Row>
              <Row label="Goals">{p.campaignGoals.length ? p.campaignGoals.join(", ") : "Not shared"}</Row>
              <Row label="Company size">{p.companySize ? `${p.companySize} people` : "Not shared"}</Row>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {value == null ? "—" : typeof value === "number" ? compact.format(value) : value}
      </dd>
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: { label: string; pct: number }[] }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{title}</span>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2">
          <span>{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, r.pct)}%` }} />
          </span>
          <span className="text-right tabular-nums text-muted-foreground">{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
