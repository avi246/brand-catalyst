// Times Gemini models for our use cases. npx tsx scripts/gemini-ping.ts
import { config } from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const schema = {
  type: "object",
  properties: { ok: { type: "boolean" }, word: { type: "string" } },
  required: ["ok", "word"],
};

async function time(model: string, level?: ThinkingLevel) {
  const t0 = Date.now();
  try {
    const r = await ai.models.generateContent({
      model,
      contents: 'Reply with JSON {"ok": true, "word": "<one word for a handshake>"}',
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}),
      },
    });
    console.log(`${model} ${level ?? "default"}: ${Date.now() - t0}ms ${r.text}`);
  } catch (e) {
    console.log(`${model} ${level ?? "default"}: FAILED after ${Date.now() - t0}ms: ${(e as Error).message.slice(0, 160)}`);
  }
}

async function main() {
  await time("gemini-3.8-flash", ThinkingLevel.MINIMAL);
  await time("gemini-3.8-flash", ThinkingLevel.LOW);
  await time("gemini-3.5-flash-lite", ThinkingLevel.MINIMAL);
  await time("gemini-3.5-flash-lite");
}

main();
