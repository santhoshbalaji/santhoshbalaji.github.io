// Reads AI agent token usage from the local T3 Code state database and writes usage.json.
// Totals only: no thread names, prompts or project names leave this machine.
//   npm run usage          then          npm run build
import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dbPath = process.env.T3_STATE_DB ?? path.join(os.homedir(), ".t3/userdata/statev2.sqlite");
const db = new DatabaseSync(dbPath, { readOnly: true });
const rows = db.prepare(`select t.started_at as at, r.provider as provider, json_extract(t.payload_json,'$.model') as model,
  json_extract(t.payload_json,'$.turnTokenUsage') as usage, t.thread_id as thread
  from orchestration_v2_projection_provider_turns t
  left join orchestration_v2_projection_run_attempts r on r.attempt_id = t.run_attempt_id`).all();
const NAMES = { claudeAgent: "Claude Code (Anthropic)", codex: "Codex (OpenAI)", antigravity: "Antigravity (Google)" };
const blank = () => ({ turns: 0, input: 0, cached: 0, cacheWrites: 0, output: 0, reasoning: 0 });
const add = (a, u) => { a.turns++; a.input += u.inputTokens ?? 0; a.cached += u.cachedInputTokens ?? 0; a.cacheWrites += u.cacheCreationTokens ?? 0; a.output += u.outputTokens ?? 0; a.reasoning += u.reasoningTokens ?? 0; };
const total = blank(), providers = {}, models = {}, days = {}, threads = new Set();
let first = null, last = null;
for (const r of rows) {
  if (!r.usage || !r.at) continue;
  const u = JSON.parse(r.usage);
  if (u.inputTokens == null) continue;
  const day = r.at.slice(0, 10), p = NAMES[r.provider] ?? "Other";
  add(total, u); add(providers[p] ??= blank(), u); add(days[day] ??= blank(), u);
  if (r.model) add(models[r.model] ??= blank(), u);
  threads.add(r.thread);
  if (!first || r.at < first) first = r.at; if (!last || r.at > last) last = r.at;
}
const out = { generatedAt: new Date().toISOString().slice(0, 10), from: first?.slice(0, 10), to: last?.slice(0, 10), threads: threads.size, total, providers, models,
  days: Object.keys(days).sort().map((d) => ({ day: d, ...days[d] })) };
await writeFile(new URL("../usage.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`usage.json: ${out.from} to ${out.to}, ${out.threads} threads, ${total.turns} turns, ${(total.input / 1e9).toFixed(2)}B tokens processed, ${(total.output / 1e6).toFixed(1)}M output`);
