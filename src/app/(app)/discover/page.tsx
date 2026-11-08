import Link from "next/link";
import { eq } from "drizzle-orm";
import { MapPin, SearchX, Sparkles } from "lucide-react";
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
import { distinctCountries, searchBrands, searchCreators, type Understood } from "@/lib/discover";
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
    plain: str(sp.plain) === "1",
  };
  const [mine] = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, me.id));
  const [{ results, understood, aiNote, rankedBy }, countries] = await Promise.all([
    searchCreators(me, filters, mine ?? null),
    distinctCountries("creators"),
  ]);
  const relations = await getRelations(me.id, results.map((r) => r.user.id));

  return (
    <>
      <PageHeader
        title="Discover creators"
        description="Describe who you need in plain English, or use the filters. Every creator gets a match score with reasons."
      />
      <FilterBar>
        <Input
          name="q"
          defaultValue={filters.q}
          placeholder='Try "vegan skincare creators with a US audience under $500"'
          className="sm:col-span-4 lg:col-span-8"
        />
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

      <SearchInsight understood={understood} aiNote={aiNote} rankedBy={rankedBy} q={filters.q} plain={filters.plain} n={results.length} noun="creator" />

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No creators match" body="Try removing a filter or searching a broader term." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((r) => (
            <Card key={r.user.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4">
                <MatchScore score={r.score} reasons={r.reasons} />
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
  const filters = {
    q: str(sp.q),
    industry: str(sp.industry),
    country: str(sp.country),
    niche: str(sp.niche),
    plain: str(sp.plain) === "1",
  };
  const [mine] = await db.select().from(influencerProfiles).where(eq(influencerProfiles.userId, me.id));
  const [{ results, understood, aiNote, rankedBy }, countries] = await Promise.all([
    searchBrands(me, filters, mine ?? null),
    distinctCountries("brands"),
  ]);
  const relations = await getRelations(me.id, results.map((r) => r.user.id));

  return (
    <>
      <PageHeader
        title="Discover brands"
        description="Describe the brands you want to work with, or use the filters. Every brand gets a match score with reasons."
      />
      <FilterBar>
        <Input
          name="q"
          defaultValue={filters.q}
          placeholder='Try "sustainable fashion brands with budgets over $1,000"'
          className="sm:col-span-4 lg:col-span-8"
        />
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

      <SearchInsight understood={understood} aiNote={aiNote} rankedBy={rankedBy} q={filters.q} plain={filters.plain} n={results.length} noun="brand" />

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="No brands match" body="Try removing a filter or searching a broader term." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((r) => (
            <Card key={r.user.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4">
                <MatchScore score={r.score} reasons={r.reasons} />
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

/** Shows what Gemini understood from a plain-English search, and how results are ranked. */
function SearchInsight({
  understood,
  aiNote,
  rankedBy,
  q,
  plain,
  n,
  noun,
}: {
  understood: Understood;
  aiNote: string | null;
  rankedBy: "search" | "profile" | "rules";
  q?: string;
  plain?: boolean;
  n: number;
  noun: string;
}) {
  const ranking =
    rankedBy === "search"
      ? "Ranked by match to your search"
      : rankedBy === "profile"
        ? "Ranked by match to your profile"
        : "Ranked by your preferences";
  return (
    <div className="mb-4 flex flex-col gap-2">
      {understood.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-sm dark:border-violet-900 dark:bg-violet-950/20">
          <Sparkles className="size-4 text-violet-600" />
          <span className="text-muted-foreground">Gemini understood:</span>
          {understood.map((u) => (
            <Badge key={u.label} variant="outline" className="bg-background">
              <span className="text-muted-foreground">{u.label}:</span> {u.value}
            </Badge>
          ))}
          {q && (
            <Link href={`/discover?q=${encodeURIComponent(q)}&plain=1`} className="ml-auto text-xs text-muted-foreground underline">
              Search my exact words instead
            </Link>
          )}
        </div>
      )}
      {plain && q && (
        <p className="text-xs text-muted-foreground">
          Matching your exact words.{" "}
          <Link href={`/discover?q=${encodeURIComponent(q)}`} className="underline">
            Let Gemini understand it
          </Link>
        </p>
      )}
      {aiNote && <p className="text-xs text-amber-700 dark:text-amber-300">{aiNote}</p>}
      <p className="text-sm text-muted-foreground">
        {n} {noun}
        {n === 1 ? "" : "s"} · {ranking}
      </p>
    </div>
  );
}

/** The 0-100 match score and its reasons, at the top of every card. */
function MatchScore({ score, reasons }: { score: number; reasons: string[] }) {
  const tone =
    score >= 75
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      : score >= 55
        ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
        : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-2.5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-base font-semibold tabular-nums", tone)}>
        {score}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium">Match score</p>
        {reasons.length ? (
          <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
            {reasons.map((r) => (
              <li key={r} className="truncate" title={r}>
                ✓ {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">Fill in your profile for better reasons</p>
        )}
      </div>
    </div>
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
