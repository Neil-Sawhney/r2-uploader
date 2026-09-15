import {
  DEFAULT_EXPIRY_PRESET,
  EXPIRY_PRESETS,
  expiresAtFromPreset,
  formatExpiryLabel,
  isExpired,
  kvExpirationOptions,
  parseExpiresAt,
} from "../src/utils/expiry.js";
import expiry from "../api/expiry.js";
import prune from "../api/prune.js";
import shortlink from "../api/shortlink.js";
import worker from "../src/index.js";
import { slugKey, targetKey } from "../src/utils/shortSlug.js";

function fail(message) {
  console.error(`verify-expiry: ${message}`);
  process.exit(1);
}

function memoryKv() {
  const mem = new Map();
  return {
    get: async (key) => mem.get(key) ?? null,
    put: async (key, value, _options) => {
      mem.set(key, value);
    },
    delete: async (key) => {
      mem.delete(key);
    },
    _mem: mem,
  };
}

async function jsonRequest(path, { method = "GET", body, env } = {}) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const req = new Request("https://wormhole.neilneilneil.com" + path, init);
  if (path.startsWith("/api/expiry")) {
    return expiry(req, env);
  }
  if (path.startsWith("/api/prune")) {
    return prune(req, env);
  }
  if (path.startsWith("/api/shortlink")) {
    return shortlink(req, env);
  }
  return worker.fetch(req, env, { waitUntil: () => {} });
}

if (DEFAULT_EXPIRY_PRESET !== "never") {
  fail("default expiry should be never");
}

const ids = EXPIRY_PRESETS.map((item) => item.id).join(",");
if (ids !== "1m,1h,24h,1w,1mo,never") {
  fail(`unexpected presets: ${ids}`);
}

const now = Date.now();
if (expiresAtFromPreset("never", now) !== null) {
  fail("never should not produce an expiresAt");
}
if (expiresAtFromPreset("1h", now) !== now + 60 * 60 * 1000) {
  fail("1h preset should add one hour");
}
if (expiresAtFromPreset("1mo", now) !== now + 30 * 24 * 60 * 60 * 1000) {
  fail("1 month should be 30 days");
}

if (parseExpiresAt("never") !== null || parseExpiresAt(0) !== null) {
  fail("parseExpiresAt should treat never/0 as null");
}

if (!isExpired(now - 1, now) || isExpired(now + 1, now) || isExpired(null, now)) {
  fail("isExpired should only be true for past timestamps");
}

if (formatExpiryLabel(null) !== "Never" || formatExpiryLabel(now - 1, now) !== "Expired") {
  fail("formatExpiryLabel should cover never and expired");
}

if (kvExpirationOptions(now + 30 * 1000, now).expiration) {
  fail("KV expiration should be omitted when remaining time is under 60s");
}
if (kvExpirationOptions(now + 120 * 1000, now).expiration !== Math.floor((now + 120 * 1000) / 1000)) {
  fail("KV expiration should use an absolute unix timestamp");
}

const env = { SHORT_LINKS: memoryKv() };
const target = "https://r2.neilneilneil.com/keep/file.exe";
const key = "keep/file.exe";

const saved = await jsonRequest("/api/expiry", {
  method: "PUT",
  env,
  body: {
    key,
    target,
    expiresAt: now + 10 * 60 * 1000,
    size: 42,
    preset: "1m",
  },
});
if (saved.status !== 200) {
  fail(`PUT expiry should succeed, got ${saved.status}`);
}

const listed = await jsonRequest("/api/expiry", { env });
const listedJson = await listed.json();
if (!listedJson.items?.some((item) => item.key === key && item.expiresAt === now + 10 * 60 * 1000)) {
  fail("GET /api/expiry should include the indexed file");
}

const slugPut = await jsonRequest("/api/shortlink", {
  method: "PUT",
  env,
  body: { slug: "coolfile", target },
});
if (slugPut.status !== 200) {
  fail(`PUT shortlink should succeed, got ${slugPut.status}`);
}
if (!(await env.SHORT_LINKS.get(slugKey("coolfile")))) {
  fail("short link slug should be stored");
}

const prunedEarly = await jsonRequest("/api/prune", { method: "POST", env });
const prunedEarlyJson = await prunedEarly.json();
if (prunedEarlyJson.expired?.length) {
  fail("prune should not delete files that are still in the future");
}

await env.SHORT_LINKS.put(slugKey("coolfile"), target);
await env.SHORT_LINKS.put(targetKey(target), "coolfile");

const expiredPut = await jsonRequest("/api/expiry", {
  method: "PUT",
  env,
  body: {
    key,
    target,
    expiresAt: Date.now() - 1000,
    size: 42,
    preset: "1m",
  },
});
if (expiredPut.status !== 200) {
  fail(`updating to a past expiry should succeed, got ${expiredPut.status}`);
}

await env.SHORT_LINKS.put(slugKey("coolfile"), target);
await env.SHORT_LINKS.put(targetKey(target), "coolfile");

const gone = await worker.fetch(
  new Request("https://wormhole.neilneilneil.com/coolfile"),
  env,
  { waitUntil: () => {} },
);
if (gone.status !== 410) {
  fail(`expired short link should 410, got ${gone.status}`);
}

const pruned = await jsonRequest("/api/prune", { method: "POST", env });
const prunedJson = await pruned.json();
if (!prunedJson.expired?.some((item) => item.key === key)) {
  fail("prune should return the expired object key for client-side R2 delete");
}
if (await env.SHORT_LINKS.get(slugKey("coolfile"))) {
  fail("prune should delete the short-link slug");
}
if (await env.SHORT_LINKS.get(targetKey(target))) {
  fail("prune should delete the short-link reverse index");
}

const stillIndexed = await jsonRequest("/api/expiry", { env });
const stillIndexedJson = await stillIndexed.json();
if (!stillIndexedJson.items?.some((item) => item.key === key)) {
  fail("expired files should stay in the index until the SPA confirms the R2 delete");
}

const neverPut = await jsonRequest("/api/expiry", {
  method: "PUT",
  env,
  body: { key: "keep/forever.bin", target: "https://r2.neilneilneil.com/keep/forever.bin", expiresAt: null },
});
if (neverPut.status !== 200) {
  fail("never-expire PUT should succeed");
}
const afterNever = await jsonRequest("/api/expiry", { env });
const afterNeverJson = await afterNever.json();
if (afterNeverJson.items?.some((item) => item.key === "keep/forever.bin")) {
  fail("never-expire files should not be in the prune index");
}

const removed = await jsonRequest("/api/expiry", {
  method: "DELETE",
  env,
  body: { key, target },
});
if (removed.status !== 200) {
  fail(`DELETE expiry should succeed, got ${removed.status}`);
}
const emptyIndex = await jsonRequest("/api/expiry", { env });
const emptyIndexJson = await emptyIndex.json();
if (emptyIndexJson.items?.some((item) => item.key === key)) {
  fail("DELETE expiry should drop the file from the prune index");
}

if (typeof worker.scheduled !== "function") {
  fail("Worker should export a scheduled handler for the hourly cron");
}

const unbound = await jsonRequest("/api/prune", { method: "POST", env: {} });
if (unbound.status !== 503) {
  fail(`missing KV should be 503, got ${unbound.status}`);
}

console.log("verify-expiry: ok");
