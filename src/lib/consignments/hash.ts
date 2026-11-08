import "server-only";
import { createHash } from "node:crypto";
import type { ConsignmentContent } from "./schema";

/*
 * Acceptance binds to the exact content of a version: same content -> same SHA-256 hash,
 * and any change (even one character) -> a different hash. A deal is final only when both
 * parties have accepted the same hash.
 */

/** JSON with object keys sorted, so key order never changes the hash. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashContent(content: ConsignmentContent): string {
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}
