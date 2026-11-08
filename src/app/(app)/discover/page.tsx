import Link from "next/link";
import { eq } from "drizzle-orm";
import { MapPin, SearchX } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { RelationActions } from "@/components/relation-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, type User } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getRelations } from "@/lib/connections";
import { INDUSTRIES, NICHES, PLATFORM_LABEL, PLATFORMS } from "@/lib/constants";
import { distinctCountries, searchBrands, searchCreators } from "@/lib/discover";
import { cn } from "@/lib/utils";

export const metadata = { title: "Discover" };

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
const num = (v: string | string[] | undefined) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const usd = (n: number) => n.toLocaleString("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const initials = (s: string) =>
  s.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const me = await requireUser();
  const sp = (await searchParams) as SP;
  return me.role === "brand" ? <CreatorSearch me={me} sp={sp} /> : <BrandSearch me={me} sp={sp} />;
}

/* ------------------------------ Brand view: find creators ------------------------------ */

async function CreatorSearch({ me, sp }: { me: User; sp: SP }) {
  const filters = {
    q: str(sp.q),
    niche: str(sp.niche),
    platform: str(sp.platform),
    country: str(sp.country),
    minFollowers: num(sp.minFollowers),
    maxRate: num(sp.maxRate),
  };
  const [mine] = await db
    .select({ preferredNiches: brandProfiles.preferredNiches })
    .from(brandProfiles)
    .where(eq(brandProfiles.userId, me.id));
  const [results, countries] = await Promise.all([
    searchCreators(me.id, filters, mine?.preferredNiches ?? []),
    distinctCountries("creators"),
  ]);
  const relations = await getRelations(me.id, results.map((r) => r.user.id));

  return (
    <>
      <PageHeader
        title="Discover creators"
        description="Filter by niche, platform, audience size and price. Invite the ones who fit."
      />
      <FilterBar>
        <Input name="q" defaultValue={filters.q} placeholder="Search name, handle, bio…" className="sm:col-span-2" />
        <NativeSelect name="niche" defaultValue={filters.niche ?? ""} aria-label="Niche">
          <option value="">Any niche</option>
          {NICHES.map((n) => <option key={n}>{n}</option>)}
        </NativeSelect>
        <NativeSelect name="platform" defaultValue={filters.platform ?? ""} aria-label="Platform">
          <option value="">Any platform</option>
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </NativeSelect>
        <NativeSelect name="country" defaultValue={filters.country ?? ""} aria-label="Country">
          <option value="">Any country</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </NativeSelect>
        <NativeSelect name="minFollowers" defaultValue={String(filters.minFollowers ?? "")} aria-label="Minimum followers">
          <option value="">Any audience size</option>
          <option value="10000">10k+ followers</option>
          <option value="50000">50k+ followers</option>
          <option value="100000">100k+ followers</option>
          <option value="500000">500k+ followers</option>
        </NativeSelect>
        <NativeSelect name="maxRate" defaultValue={String(filters.maxRate ?? "")} aria-label="Maximum starting rate">
          <option value="">Any price</option>
          <option value="250">From $250 or less</option>
          <option value="500">From $500 or less</option>
          <option value="1000">From $1,000 or less</option>
          <option value="2500">From $2,500 or less</option>
        </NativeSelect>
      </FilterBar>

      <ResultCount n={results.length} noun="creator" />

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No creators match" body="Try removing a filter or searching a broader term." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((r) => (
            <Card key={r.user.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11">
                    {r.user.avatarUrl && <AvatarImage src={r.user.avatarUrl} alt="" />}
                    <AvatarFallback>{initials(r.user.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/creators/${r.profile.handle}`} className="font-medium hover:underline">
                      {r.user.displayName}
                    </Link>
                    <div className="truncate text-sm text-muted-foreground">
                      @{r.profile.handle} · {PLATFORM_LABEL[r.profile.primaryPlatform]}
                    </div>
                  </div>
                  {r.user.isDemo && <Badge variant="outline">Demo</Badge>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge>{r.profile.primaryNiche}</Badge>
                  {r.fitsPreferred && <Badge variant="secondary">Fits your niches</Badge>}
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{r.profile.bio}</p>

                <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <Mini label="Followers" value={r.account?.followers != null ? compact.format(r.account.followers) : "—"} />
                  <Mini label="Engagement" value={r.account?.engagementRate != null ? `${r.account.engagementRate}%` : "—"} />
                  <Mini label="From" value={r.fromRate != null ? usd(r.fromRate) : "—"} />
                </dl>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> {[r.profile.city, r.profile.country].filter(Boolean).join(", ")}
                  </span>
                  <RelationActions
                    otherUserId={r.user.id}
                    otherName={r.user.displayName}
                    state={relations.get(r.user.id) ?? { kind: "none" }}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <SelfReportedNote />
    </>
  );
}

/* ------------------------------ Creator view: find brands ------------------------------ */

async function BrandSearch({ me, sp }: { me: User; sp: SP }) {
  const filters = { q: str(sp.q), industry: str(sp.industry), country: str(sp.country), niche: str(sp.niche) };
  const [mine] = await db
    .select({ primary: influencerProfiles.primaryNiche, secondary: influencerProfiles.secondaryNiches })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, me.id));
  const myNiches = mine ? [mine.primary, ...mine.secondary] : [];
  const [results, countries] = await Promise.all([
    searchBrands(me.id, filters, myNiches),
    distinctCountries("brands"),
  ]);
  const relations = await getRelations(me.id, results.map((r) => r.user.id));

  return (
    <>
      <PageHeader
        title="Discover brands"
        description="Find brands looking for creators like you. Check who they are before you connect."
      />
      <FilterBar>
        <Input name="q" defaultValue={filters.q} placeholder="Search brand, product, industry…" className="sm:col-span-2" />
        <NativeSelect name="industry" defaultValue={filters.industry ?? ""} aria-label="Industry">
          <option value="">Any industry</option>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </NativeSelect>
        <NativeSelect name="niche" defaultValue={filters.niche ?? ""} aria-label="Looking for niche">
          <option value="">Looking for any niche</option>
          {NICHES.map((n) => <option key={n}>{n}</option>)}
        </NativeSelect>
        <NativeSelect name="country" defaultValue={filters.country ?? ""} aria-label="Country">
          <option value="">Any country</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </NativeSelect>
      </FilterBar>

      <ResultCount n={results.length} noun="brand" />

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No brands match" body="Try removing a filter or searching a broader term." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((r) => (
            <Card key={r.user.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 rounded-lg">
                    {r.profile.logoUrl && <AvatarImage src={r.profile.logoUrl} alt="" />}
                    <AvatarFallback className="rounded-lg">{initials(r.profile.brandName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/brands/${r.profile.slug}`} className="font-medium hover:underline">
                      {r.profile.brandName}
                    </Link>
                    <div className="truncate text-sm text-muted-foreground">
                      {r.profile.industry} · {r.profile.country}
                    </div>
                  </div>
                  {r.user.isDemo && <Badge variant="outline">Demo</Badge>}
                </div>

                {r.fitsMyNiche && (
                  <Badge variant="secondary" className="w-fit">Looking for your niche</Badge>
                )}

                <p className="line-clamp-3 text-sm text-muted-foreground">{r.profile.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {r.profile.preferredNiches.slice(0, 3).map((n) => (
                    <Badge key={n} variant="outline">{n}</Badge>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {r.profile.budgetMin != null && r.profile.budgetMax != null
                      ? `Budget ${usd(r.profile.budgetMin)}–${usd(r.profile.budgetMax)}`
                      : "Budget not shared"}
                  </span>
                  <RelationActions
                    otherUserId={r.user.id}
                    otherName={r.profile.brandName}
                    state={relations.get(r.user.id) ?? { kind: "none" }}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------- Pieces ---------------------------------------- */

/** A plain GET form: filters live in the URL, so results can be bookmarked and shared. */
function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <form method="get" className="mb-6 grid gap-2 rounded-xl border bg-background p-3 sm:grid-cols-4 lg:grid-cols-8">
      {children}
      <div className="flex gap-2 sm:col-span-4 lg:col-span-1">
        <Button type="submit" className="flex-1">Apply</Button>
        <Link href="/discover" className={cn(buttonVariants({ variant: "ghost" }))}>Clear</Link>
      </div>
    </form>
  );
}

function ResultCount({ n, noun }: { n: number; noun: string }) {
  return (
    <p className="mb-4 text-sm text-muted-foreground">
      {n} {noun}
      {n === 1 ? "" : "s"}
    </p>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function SelfReportedNote() {
  return (
    <p className="mt-6 text-xs text-muted-foreground">
      Follower, engagement and rate figures are self-reported unless a profile shows a Verified badge.
    </p>
  );
}
