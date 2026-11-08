// Tests contract rendering, fingerprinting and the Gemini template conflict check.
// node --conditions=react-server --env-file=.env.local --import tsx scripts/smoke-contract.ts
import assert from "node:assert/strict";
import { checkContractConflicts } from "@/lib/ai/conflicts";
import { hashContract } from "@/lib/consignments/hash";
import { defaultContent } from "@/lib/consignments/schema";
import { DEFAULT_CONTRACT_TEMPLATE, renderContract } from "@/lib/contracts/template";

async function main() {
  const c = defaultContent();
  c.overview = { title: "Summer SPF launch", product: "Lumen Daily SPF 50", objective: "Awareness", keyMessage: "" };
  c.fee.amount = 700;
  c.terms = c.terms.map((t) => (t.key === "t3" ? { ...t, text: "Brand may repost the content on its own social channels for 1 month. No paid ads." } : t));

  // 1. Sample template renders with every placeholder filled.
  const text = renderContract(null, { brandName: "Lumen Skincare", creatorName: "Avi", creatorHandle: "avi", content: c, effectiveDate: new Date("2026-11-08T12:00:00") });
  assert.ok(!/\{\{/.test(text), "no placeholders left");
  assert.ok(text.includes("SCHEDULE A: CAMPAIGN TERMS") && text.includes("$700") && text.includes("@avi"));
  console.log(text.split("\n").slice(0, 6).join("\n"), "\n...\n", text.split("\n").slice(-6).join("\n"));

  // 2. A template without {{schedule_a}} still gets Schedule A appended.
  const custom = "Agreement between {{brand_name}} and {{creator_name}}. Fee {{fee}}.\nUsage rights: the Brand may use all content for 6 months, including paid ads.\nThe Creator delivers a monthly analytics report.";
  const t2 = renderContract(custom, { brandName: "Lumen Skincare", creatorName: "Avi", content: c, effectiveDate: new Date() });
  assert.ok(t2.endsWith(t2.slice(t2.indexOf("SCHEDULE A"))) && t2.includes("SCHEDULE A"), "schedule appended");

  // 3. Fingerprint covers the template text too.
  assert.notEqual(hashContract(c, text), hashContract(c, text + " "), "any text change changes the fingerprint");

  // 4. Gemini spots the contradiction (6 months + paid ads vs 1 month, no paid ads).
  const t0 = Date.now();
  const issues = await checkContractConflicts(custom, c);
  console.log(`\nConflict check (${Date.now() - t0}ms):`);
  for (const i of issues) console.log(` - [${i.kind}] template: ${i.templateSays}\n     agreed: ${i.agreedTerm}\n     ${i.explanation}`);
  assert.ok(issues.some((i) => /6 month|six month|paid/i.test(i.templateSays)), "should flag the usage-rights conflict");

  // 5. The sample template shouldn't produce noisy false alarms.
  const sampleIssues = await checkContractConflicts(DEFAULT_CONTRACT_TEMPLATE, c);
  console.log(`\nSample template issues: ${sampleIssues.length}`);
  for (const i of sampleIssues) console.log(` - [${i.kind}] ${i.templateSays} | ${i.explanation}`);
  console.log("\nAll contract checks passed.");
}
main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
