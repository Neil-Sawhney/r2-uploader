import { _res } from "../utils/response.js";
import { parseExpiresAt } from "../src/utils/expiry.js";
import {
  readExpiryIndex,
  readExpiryMeta,
  removeExpiry,
  upsertExpiry,
} from "./expiryKv.js";

function kv(env) {
  return env?.SHORT_LINKS;
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export default async function (req, env) {
  const store = kv(env);
  if (!store) {
    return _res.json(
      {
        error: "kv_unbound",
        message:
          "SHORT_LINKS KV is not bound. Create the namespace and bind it (see CLOUDFLARE.md).",
      },
      503,
    );
  }

  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  if (method === "GET") {
    const key = String(url.searchParams.get("key") || "").trim();
    if (key) {
      const meta = await readExpiryMeta(store, key);
      return _res.json(
        meta || { key, expiresAt: null, target: "" },
        meta ? 200 : 200,
      );
    }

    const items = await readExpiryIndex(store);
    return _res.json({ items });
  }

  if (method === "PUT") {
    const body = await readJson(req);
    const key = String(body.key || "").trim();
    if (!key) {
      return _res.json({ error: "key_required", message: "File key is required." }, 400);
    }

    try {
      const meta = await upsertExpiry(store, {
        key,
        target: body.target,
        expiresAt: parseExpiresAt(body.expiresAt),
        size: body.size,
        preset: body.preset,
      });
      return _res.json(meta);
    } catch (err) {
      return _res.json({ error: "save_failed", message: err.message || "Could not save expiry." }, 400);
    }
  }

  if (method === "DELETE") {
    const body = await readJson(req);
    const key = String(body.key || url.searchParams.get("key") || "").trim();
    if (!key) {
      return _res.json({ error: "key_required", message: "File key is required." }, 400);
    }
    const target = String(body.target || url.searchParams.get("target") || "").trim();
    const result = await removeExpiry(store, key, target);
    return _res.json(result);
  }

  return _res.json({ message: "method_not_allowed" }, 405);
}
