import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { connections } from "@/db/schema";
import { getPeople, type Person } from "@/lib/people";

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
  other: Person;
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

  const people = await getPeople(rows.map((c) => (c.fromUserId === meId ? c.toUserId : c.fromUserId)));

  return rows.flatMap((c) => {
    const other = people.get(c.fromUserId === meId ? c.toUserId : c.fromUserId);
    if (!other) return [];
    return [
      {
        id: c.id,
        status: c.status,
        direction: c.fromUserId === meId ? ("sent" as const) : ("received" as const),
        note: c.note,
        createdAt: c.createdAt,
        other,
      },
    ];
  });
}

export async function getRelation(meId: string, otherId: string): Promise<RelationState> {
  return (await getRelations(meId, [otherId])).get(otherId) ?? { kind: "none" };
}
