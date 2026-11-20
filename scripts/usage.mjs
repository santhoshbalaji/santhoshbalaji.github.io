// Reads AI agent usage from T3 Code on this machine and writes usage.json.
// Tokens come from the same scan T3 Code's own usage page shows (its usage cache); the thread count comes from
// T3 Code's thread records. Totals only: no thread names, prompts, file paths or project names leave this machine.
// Window: USAGE_FROM (default 2026-11-01) to now, in India time. `npm run usage`, then `npm run build`.
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const userdata = process.env.T3_USERDATA ?? path.join(os.homedir(), ".t3/userdata");
const TZ = "Asia/Kolkata";
const from = process.env.USAGE_FROM ?? "2026-11-01";
const start = Date.parse(`${from}T00:00:00+05:30`);
const day = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });

// The usage cache is versioned in its file name (usage-scan-cache-v17.json); take the newest version.
const caches = (await readdir(userdata)).filter((f) => /^usage-scan-cache-v\d+\.json$/.test(f))
  .sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
if (!caches.length) throw new Error(`No T3 Code usage cache in ${userdata}. Open T3 Code's usage page once to create it.`);
const cache = JSON.parse(await readFile(path.join(userdata, caches[0]), "utf8"));

// Each record: [time ms, model index, session index, uncached input, cache read, cache write, output, reasoning, request id, …]
const NAMES = { claude: "Claude Code (Anthropic)", codex: "Codex (OpenAI)" };
const blank = () => ({ processed: 0, cached: 0, uncached: 0, cacheWrites: 0, output: 0, sessions: new Set() });
const total = blank(), providers = {}, models = {}, days = {};
const seen = new Set();
let last = 0;
for (const file of Object.values(cache.files)) {
  for (const r of file.r) {
    const [at, modelIdx, sessionIdx, uncached, cached, cacheWrites, output] = r;
    if (at < start) continue;
    const id = r[8];
    if (id) { const key = `${file.p}:${id}`; if (seen.has(key)) continue; seen.add(key); }
    const session = `${file.p}:${sessionIdx}`;
    const add = (a) => {
      a.uncached += uncached; a.cached += cached; a.cacheWrites += cacheWrites; a.output += output;
      a.processed += uncached + cached + cacheWrites + output; a.sessions.add(session);
    };
    add(total); add(providers[NAMES[file.p] ?? "Other"] ??= blank()); add(days[day(at)] ??= blank());
    const model = cache.models[modelIdx];
    if (model) add(models[model] ??= blank());
    last = Math.max(last, at);
  }
}
if (!total.processed) throw new Error("No usage found in the window: the cache layout may have changed.");

const db = new DatabaseSync(path.join(userdata, "statev2.sqlite"), { readOnly: true });
const threads = db.prepare(`select count(*) n from orchestration_v2_projection_threads where created_at >= ? and deleted_at is null`)
  .get(new Date(start).toISOString()).n;

const plain = (a) => ({ ...a, sessions: a.sessions.size });
const map = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, plain(v)]));
const out = {
  generatedAt: day(Date.now()), from, to: day(last), threads, total: plain(total), providers: map(providers), models: map(models),
  days: Object.keys(days).sort().map((d) => ({ day: d, ...plain(days[d]) })),
};
await writeFile(new URL("../usage.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`usage.json: ${out.from} to ${out.to}, ${threads} threads, ${out.total.sessions} sessions, ${(total.processed / 1e9).toFixed(2)}B tokens processed, ${(total.output / 1e6).toFixed(1)}M output`);
