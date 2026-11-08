import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/** Gemini embedding size we store (gemini-embedding-001 with outputDimensionality 768). */
export const EMBEDDING_DIMS = 768;

/* ----------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const userRole = pgEnum("user_role", ["brand", "influencer"]);

export const platform = pgEnum("platform", [
  "instagram",
  "youtube",
  "tiktok",
  "other",
]);

/** Where a stat came from. Only the server sync job may write `verified` / `owner`. */
export const statSource = pgEnum("stat_source", ["self", "verified", "owner"]);

export const connectionStatus = pgEnum("connection_status", [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
]);

export const consignmentStatus = pgEnum("consignment_status", [
  "draft",
  "sent",
  "negotiating",
  // The brand sent the clean final agreement; waiting for the creator to accept it.
  "awaiting_acceptance",
  "final",
  "in_progress",
  "completed",
  "cancelled",
]);

export const commentKind = pgEnum("comment_kind", [
  "comment",
  "counter",
  "question",
]);

export const deliverableStatus = pgEnum("deliverable_status", [
  "not_started",
  "draft_submitted",
  "changes_requested",
  "approved",
  "published",
  "verified",
]);

/* ----------------------------------------------------------------------------
 * Users and profiles
 * ------------------------------------------------------------------------- */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  role: userRole("role").notNull(),
  email: text("email"),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  /** Seeded demo accounts are tagged so nothing simulated is presented as real. */
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const influencerProfiles = pgTable("influencer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  bio: text("bio"),
  primaryNiche: text("primary_niche").notNull(),
  secondaryNiches: text("secondary_niches").array().notNull().default([]),
  city: text("city"),
  country: text("country").notNull(),
  languages: text("languages").array().notNull().default([]),
  primaryPlatform: platform("primary_platform").notNull(),
  contentFormats: text("content_formats").array().notNull().default([]),
  /** Rate card, in whole currency units, keyed by format, e.g. { reel: 400 }. */
  rateCard: jsonb("rate_card").$type<Record<string, number>>().notNull().default({}),
  currency: text("currency").notNull().default("USD"),
  /** e.g. [{ country: "US", pct: 62 }] */
  audienceTopCountries: jsonb("audience_top_countries")
    .$type<{ country: string; pct: number }[]>()
    .notNull()
    .default([]),
  /** e.g. [{ band: "18-24", pct: 41 }] */
  audienceAgeBands: jsonb("audience_age_bands")
    .$type<{ band: string; pct: number }[]>()
    .notNull()
    .default([]),
  pastBrands: text("past_brands").array().notNull().default([]),
  excludedCategories: text("excluded_categories").array().notNull().default([]),
  availability: text("availability"),
  /** Gemini embedding of the profile text, for matching by meaning (pgvector). */
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMS }),
  /** The exact text that was embedded, so we only re-embed when it changes. */
  embeddingSource: text("embedding_source"),
  ...timestamps,
});

export const brandProfiles = pgTable("brand_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  brandName: text("brand_name").notNull(),
  companyName: text("company_name"),
  website: text("website").notNull(),
  industry: text("industry").notNull(),
  country: text("country").notNull(),
  markets: text("markets").array().notNull().default([]),
  description: text("description"),
  logoUrl: text("logo_url"),
  companySize: text("company_size"),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  currency: text("currency").notNull().default("USD"),
  targetAudience: text("target_audience"),
  campaignGoals: text("campaign_goals").array().notNull().default([]),
  preferredNiches: text("preferred_niches").array().notNull().default([]),
  preferredPlatforms: text("preferred_platforms").array().notNull().default([]),
  paymentTerms: text("payment_terms"),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMS }),
  embeddingSource: text("embedding_source"),
  ...timestamps,
});

/**
 * One row per (user, platform). Self-reported numbers live here; verified
 * numbers are written only by the server sync job and carry `source` + `verifiedAt`.
 */
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: platform("platform").notNull(),
    handle: text("handle").notNull(),
    url: text("url").notNull(),
    followers: integer("followers"),
    avgViews: integer("avg_views"),
    engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }),
    source: statSource("source").notNull().default("self"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("social_accounts_user_platform").on(t.userId, t.platform)],
);

/* ----------------------------------------------------------------------------
 * Connections (invitations) and messaging
 * ------------------------------------------------------------------------- */

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: connectionStatus("status").notNull().default("pending"),
    note: text("note"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("connections_from").on(t.fromUserId),
    index("connections_to").on(t.toUserId),
  ],
);

/** Created only when a connection is accepted. */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .notNull()
    .unique()
    .references(() => connections.id, { onDelete: "cascade" }),
  createdAt: timestamps.createdAt,
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachmentUrl: text("attachment_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("messages_conversation_time").on(t.conversationId, t.createdAt)],
);

/* ----------------------------------------------------------------------------
 * Consignments: versioned, clause-based agreements
 * ------------------------------------------------------------------------- */

export const consignments = pgTable(
  "consignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandUserId: uuid("brand_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    influencerUserId: uuid("influencer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: consignmentStatus("status").notNull().default("draft"),
    currentVersion: integer("current_version").notNull().default(0),
    /** Set when the creator clicks "Ready to finalize". Cleared when the brand sends the final agreement. */
    creatorReadyAt: timestamp("creator_ready_at", { withTimezone: true }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("consignments_brand").on(t.brandUserId),
    index("consignments_influencer").on(t.influencerUserId),
  ],
);

/** Insert-only. A version is never updated; every change creates a new one. */
export const consignmentVersions = pgTable(
  "consignment_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consignmentId: uuid("consignment_id")
      .notNull()
      .references(() => consignments.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    /** The clause list; shape defined in src/lib/consignments/schema.ts */
    content: jsonb("content").notNull(),
    /** SHA-256 of the canonical JSON of `content`. Acceptance binds to this. */
    contentHash: text("content_hash").notNull(),
    /** True for the clean final agreement the creator accepts (no priorities, no open points). */
    isFinal: boolean("is_final").notNull().default(false),
    /** For final agreements: how each term was resolved, with the comments it came from. */
    resolution: jsonb("resolution"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    changeNote: text("change_note"),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("consignment_version_no").on(t.consignmentId, t.versionNo)],
);

export const clauseComments = pgTable(
  "clause_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => consignmentVersions.id, { onDelete: "cascade" }),
    clauseKey: text("clause_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: commentKind("kind").notNull().default("comment"),
    body: text("body").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("clause_comments_version").on(t.versionId)],
);

/** A consignment is final when both parties accepted the same version hash. */
export const acceptances = pgTable(
  "acceptances",
  {
    consignmentId: uuid("consignment_id")
      .notNull()
      .references(() => consignments.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.consignmentId, t.versionNo, t.userId] })],
);

export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consignmentId: uuid("consignment_id")
      .notNull()
      .references(() => consignments.id, { onDelete: "cascade" }),
    clauseKey: text("clause_key").notNull(),
    title: text("title").notNull(),
    status: deliverableStatus("status").notNull().default("not_started"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    publishedUrl: text("published_url"),
    ...timestamps,
  },
  (t) => [index("deliverables_consignment").on(t.consignmentId)],
);

/* ----------------------------------------------------------------------------
 * Notifications
 * ------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("notifications_user_time").on(t.userId, t.createdAt)],
);

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type InfluencerProfile = typeof influencerProfiles.$inferSelect;
export type BrandProfile = typeof brandProfiles.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
export type Platform = (typeof platform.enumValues)[number];
