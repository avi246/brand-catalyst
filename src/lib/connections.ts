import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, connections, influencerProfiles, users } from "@/db/schema";

/** How the signed-in user relates to someone else. Drives every "Invite" button. */
export type RelationState =
  | { kind: "none" }
  | { kind: "sent"; connectionId: string } // I invited them, waiting
  | { kind: "received"; connectionId: string } // they invited me, I need to respond
  | { kind: "connected"; connectionId: string }; // accepted: messaging is open

const OPEN = ["pending", "accepted"] as const;

/** One query for all the people on a page (e.g. Discover results). */
export async function getRelations(
  meId: string,
  otherIds: string[],
): Promise<Map<string, RelationState>> {
  const map = new Map<string, RelationState>();
  if (otherIds.length === 0) return map;

  const rows = await db
    .select()
    .from(connections)
    .where(
      and(
        inArray(connections.status, [...OPEN]),
        or(
          and(eq(connections.fromUserId, meId), inArray(connections.toUserId, otherIds)),
          and(eq(connections.toUserId, meId), inArray(connections.fromUserId, otherIds)),
        ),
      ),
    );

  for (const c of rows) {
    const other = c.fromUserId === meId ? c.toUserId : c.fromUserId;
    if (c.status === "accepted") map.set(other, { kind: "connected", connectionId: c.id });
    else if (c.fromUserId === meId) map.set(other, { kind: "sent", connectionId: c.id });
    else map.set(other, { kind: "received", connectionId: c.id });
  }
  return map;
}

export type ConnectionRow = {
  id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn" | "expired";
  direction: "sent" | "received";
  note: string | null;
  createdAt: Date;
  other: { id: string; name: string; subtitle: string; href: string; isDemo: boolean; avatarUrl: string | null };
};

/** Everything on the Collaborations page: my invitations both ways and my connections. */
export async function listMyConnections(meId: string): Promise<ConnectionRow[]> {
  const rows = await db
    .select()
    .from(connections)
    .where(
      and(
        inArray(connections.status, [...OPEN]),
        or(eq(connections.fromUserId, meId), eq(connections.toUserId, meId)),
      ),
    )
    .orderBy(desc(connections.createdAt));
  if (rows.length === 0) return [];

  const otherIds = rows.map((c) => (c.fromUserId === meId ? c.toUserId : c.fromUserId));
  const people = await db
    .select({ user: users, creator: influencerProfiles, brand: brandProfiles })
    .from(users)
    .leftJoin(influencerProfiles, eq(influencerProfiles.userId, users.id))
    .leftJoin(brandProfiles, eq(brandProfiles.userId, users.id))
    .where(inArray(users.id, otherIds));
  const byId = new Map(people.map((p) => [p.user.id, p]));

  return rows.flatMap((c) => {
    const otherId = c.fromUserId === meId ? c.toUserId : c.fromUserId;
    const p = byId.get(otherId);
    if (!p) return [];
    const other = p.brand
      ? {
          name: p.brand.brandName,
          subtitle: `${p.brand.industry} · ${p.brand.country}`,
          href: `/brands/${p.brand.slug}`,
          avatarUrl: p.brand.logoUrl,
        }
      : {
          name: p.user.displayName,
          subtitle: p.creator ? `@${p.creator.handle} · ${p.creator.primaryNiche}` : "",
          href: p.creator ? `/creators/${p.creator.handle}` : "#",
          avatarUrl: p.user.avatarUrl,
        };
    return [
      {
        id: c.id,
        status: c.status,
        direction: c.fromUserId === meId ? ("sent" as const) : ("received" as const),
        note: c.note,
        createdAt: c.createdAt,
        other: { id: otherId, isDemo: p.user.isDemo, ...other },
      },
    ];
  });
}

export async function getRelation(meId: string, otherId: string): Promise<RelationState> {
  return (await getRelations(meId, [otherId])).get(otherId) ?? { kind: "none" };
}
