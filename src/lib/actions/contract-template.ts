"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { brandProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contracts/template";

const MAX_TEMPLATE = 30_000;

/** Brand only. Saves the contract template; the sample template is stored as "none". */
export async function saveContractTemplate(input: { template: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser("brand");
  const text = (input.template ?? "").replace(/\r\n/g, "\n").trim();
  if (text.length > MAX_TEMPLATE) return { ok: false, error: "Templates can be up to 30,000 characters." };
  if (text && text.length < 200) return { ok: false, error: "That looks too short for a contract. Paste your full template." };

  const isSample = !text || text === DEFAULT_CONTRACT_TEMPLATE.trim();
  await db
    .update(brandProfiles)
    .set({ contractTemplate: isSample ? null : text })
    .where(eq(brandProfiles.userId, me.id));
  revalidatePath("/contracts");
  return { ok: true };
}
