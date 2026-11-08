import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileView } from "@/components/profile-view";
import { RelationActions } from "@/components/relation-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { User } from "@/db/schema";
import { getRelation } from "@/lib/connections";
import type { ProfileBundle } from "@/lib/profiles";

/** Someone else's About page, with the invite / respond panel on top. */
export async function AboutPage({ me, bundle }: { me: User; bundle: ProfileBundle }) {
  const isMe = me.id === bundle.user.id;
  const canInteract = !isMe && me.role !== bundle.user.role;
  const relation = canInteract ? await getRelation(me.id, bundle.user.id) : null;
  const name = bundle.kind === "brand" ? bundle.profile.brandName : bundle.user.displayName;

  const hint =
    relation?.kind === "connected"
      ? "You're connected. Messaging is open."
      : relation?.kind === "sent"
        ? "Waiting for them to accept. Messaging opens when they do."
        : relation?.kind === "received"
          ? `${name} invited you. Review their profile, then accept or decline.`
          : `Invite ${name} to connect. Messaging opens once they accept.`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/discover"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Discover
      </Link>

      {relation && (
        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{hint}</p>
            <RelationActions otherUserId={bundle.user.id} otherName={name} state={relation} withNote />
          </CardContent>
        </Card>
      )}

      <ProfileView bundle={bundle} />
    </div>
  );
}
