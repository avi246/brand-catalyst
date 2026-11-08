// Checks hashing and diffing of consignments.
// node --conditions=react-server --import tsx scripts/smoke-consignment.ts
import assert from "node:assert/strict";
import { hashContent } from "@/lib/consignments/hash";
import { consignmentContentSchema, defaultContent, diffContent } from "@/lib/consignments/schema";

const v1 = defaultContent();
v1.overview.title = "Summer SPF launch";
v1.overview.product = "Lumen Daily SPF 50";
v1.fee.amount = 600;

// 1. Valid content passes the schema.
assert.ok(consignmentContentSchema.safeParse(v1).success, "v1 should be valid");

// 2. Same content -> same hash, even with keys in a different order.
const reordered = JSON.parse(JSON.stringify({ terms: v1.terms, fee: v1.fee, deliverables: v1.deliverables, overview: v1.overview }));
assert.equal(hashContent(v1), hashContent(reordered), "key order must not change the hash");

// 3. Any change -> different hash.
const v2 = structuredClone(v1);
v2.fee.amount = 750;
v2.terms = v2.terms.filter((t) => t.key !== "t4");
v2.deliverables.push({ key: "d2", platform: "instagram", format: "Story", quantity: 2, draftDue: null, publishBy: "2026-11-20", notes: "", priority: "negotiable" });
assert.notEqual(hashContent(v1), hashContent(v2), "a change must change the hash");

// 4. Diff describes exactly the three changes.
const changes = diffContent(v1, v2);
console.log(changes.map((c) => `${c.kind.padEnd(7)} ${c.label}`).join("\n"));
assert.equal(changes.length, 3);
assert.ok(changes.some((c) => c.kind === "changed" && c.label === "Fee"));
assert.ok(changes.some((c) => c.kind === "added" && c.label === "Deliverable: Story"));
assert.ok(changes.some((c) => c.kind === "removed" && c.label === "Exclusivity"));

// 5. Missing title is rejected with a readable message.
const bad = structuredClone(v1);
bad.overview.title = "";
const r = consignmentContentSchema.safeParse(bad);
assert.ok(!r.success && r.error.issues[0].message === "Give the campaign a title");

console.log("\nAll consignment checks passed. v1 hash:", hashContent(v1).slice(0, 12));
