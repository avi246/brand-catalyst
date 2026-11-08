import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { EMBEDDING_DIMS } from "@/db/schema";

/*
 * The only place the app talks to Gemini. Everything else calls these helpers.
 * - generateJson(): ask Gemini for JSON that matches a Zod schema, validate it, retry once.
 * - embed():        turn texts into 768-number vectors for matching by meaning.
 * API key: GEMINI_API_KEY in .env.local (server only, never sent to the browser).
 */

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";
export const EMBED_MODEL = "gemini-embedding-001";

let client: GoogleGenAI | null = null;
function ai() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("Gemini isn't configured. Add GEMINI_API_KEY to .env.local.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export class AiError extends Error {}

export function aiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

/** Free-tier limits answer 429 ("too many requests per minute"); wait and try again. */
async function retrying<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String((e as Error)?.message ?? "");
      const retryable = /\b(429|503|RESOURCE_EXHAUSTED|UNAVAILABLE)\b/.test(msg);
      if (!retryable || i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i)); // 3 s, then 6 s
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new AiError(`${what} took too long. Try again.`)), ms)),
  ]);
}

/** Ask Gemini for structured JSON. The Zod schema is both the instruction and the validator. */
export async function generateJson<T extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: T;
  timeoutMs?: number;
  temperature?: number;
  what?: string;
}): Promise<z.infer<T>> {
  // Gemini rejects large schemas that carry size/format limits, so it gets the structure only.
  // Every limit is still enforced: the reply is validated with the full Zod schema below.
  const jsonSchema = stripLimits(z.toJSONSchema(opts.schema, { target: "draft-7" }));
  const what = opts.what ?? "Gemini";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await withTimeout(
      retrying(() =>
        ai().models.generateContent({
          model: TEXT_MODEL,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
            temperature: opts.temperature ?? 0.2,
            // Keep latency demo-friendly: minimal hidden "thinking".
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        }),
      ),
      opts.timeoutMs ?? 45_000,
      what,
    ).catch((e: unknown) => {
      if (e instanceof AiError) throw e;
      throw new AiError(`${what} is unavailable right now (${(e as Error).message?.slice(0, 120)}).`);
    });

    try {
      const parsed = opts.schema.safeParse(JSON.parse(res.text ?? ""));
      if (parsed.success) return parsed.data;
    } catch {
      // fall through to retry
    }
  }
  throw new AiError(`${what} returned something we couldn't use. Try again.`);
}

/**
 * Embeddings: lists of numbers that capture meaning. Similar meaning -> similar numbers.
 * "document" for stored profiles, "query" for what someone searches.
 */
export async function embed(texts: string[], kind: "document" | "query" = "document"): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  // The API accepts batches; 50 at a time keeps requests small.
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const res = await withTimeout(
      retrying(() =>
        ai().models.embedContent({
          model: EMBED_MODEL,
          contents: batch,
          config: {
            outputDimensionality: EMBEDDING_DIMS,
            taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          },
        }),
      ),
      20_000,
      "Matching",
    );
    for (const e of res.embeddings ?? []) out.push(normalize(e.values ?? []));
  }
  if (out.length !== texts.length) throw new AiError("Embedding count mismatch.");
  return out;
}

const LIMIT_KEYS = new Set(["$schema", "pattern", "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum"]);

/** Removes validation-only keywords from a JSON schema (structure, types, enums and descriptions stay). */
function stripLimits(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripLimits);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>)
        .filter(([k]) => !LIMIT_KEYS.has(k))
        .map(([k, v]) => [k, k === "properties" ? Object.fromEntries(Object.entries(v as object).map(([p, s]) => [p, stripLimits(s)])) : stripLimits(v)]),
    );
  }
  return node;
}

/** Scale to length 1 (needed for 768-dim embeddings so cosine similarity is accurate). */
function normalize(v: number[]) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
