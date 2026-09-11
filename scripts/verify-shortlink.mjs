import {
  normalizeSlug,
  shortUrlForSlug,
  slugKey,
  validateSlug,
} from "../src/utils/shortSlug.js";
import shortlink from "../api/shortlink.js";

function fail(message) {
  console.error(`verify-shortlink: ${message}`);
  process.exit(1);
}

if (normalizeSlug(" CoolName ") !== "coolname") {
  fail("normalizeSlug should trim and lowercase");
}

if (validateSlug("coolname") !== "") {
  fail("coolname should be valid");
}

if (!validateSlug("api")) {
  fail("api should be reserved");
}

if (!validateSlug("Cool Name")) {
  fail("spaces should be invalid");
}

if (shortUrlForSlug("coolname", "https://wormhole.neilneilneil.com/") !== "https://wormhole.neilneilneil.com/coolname") {
  fail("shortUrlForSlug should join origin and slug");
}

if (slugKey("Cool") !== "s:cool") {
  fail("slugKey should prefix a normalized slug");
}

const mem = new Map();
const env = {
  SHORT_LINKS: {
    get: async (key) => mem.get(key) ?? null,
    put: async (key, value) => {
      mem.set(key, value);
    },
    delete: async (key) => {
      mem.delete(key);
    },
  },
};

const put = await shortlink(
  new Request("https://wormhole.neilneilneil.com/api/shortlink", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "coolname",
      target: "https://r2.neilneilneil.com/test/file.exe",
    }),
  }),
  env,
);

if (put.status !== 200) {
  fail(`PUT should succeed, got ${put.status}`);
}

const get = await shortlink(
  new Request(
    "https://wormhole.neilneilneil.com/api/shortlink?target=" +
      encodeURIComponent("https://r2.neilneilneil.com/test/file.exe"),
  ),
  env,
);
const got = await get.json();
if (got.slug !== "coolname") {
  fail("GET by target should return the saved slug");
}

const taken = await shortlink(
  new Request("https://wormhole.neilneilneil.com/api/shortlink", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "coolname",
      target: "https://r2.neilneilneil.com/other.exe",
    }),
  }),
  env,
);
if (taken.status !== 409) {
  fail(`duplicate slug should be 409, got ${taken.status}`);
}

const unbound = await shortlink(
  new Request("https://wormhole.neilneilneil.com/api/shortlink?slug=coolname"),
  {},
);
if (unbound.status !== 503) {
  fail(`missing KV should be 503, got ${unbound.status}`);
}

console.log("verify-shortlink: ok");
