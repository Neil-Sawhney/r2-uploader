import { _res } from "../utils/response.js";
import {
  normalizeSlug,
  slugKey,
  targetKey,
  validateSlug,
} from "../src/utils/shortSlug.js";

function kv(env) {
  return env?.SHORT_LINKS;
}

function parseTarget(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
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
    const slug = normalizeSlug(url.searchParams.get("slug"));
    const target = parseTarget(url.searchParams.get("target"));

    if (slug) {
      const found = await store.get(slugKey(slug));
      if (!found) {
        return _res.json({ slug, target: null }, 404);
      }
      return _res.json({ slug, target: found });
    }

    if (target) {
      const found = await store.get(targetKey(target));
      if (!found) {
        return _res.json({ slug: null, target }, 404);
      }
      return _res.json({ slug: found, target });
    }

    return _res.json({ message: "slug_or_target_required" }, 400);
  }

  if (method === "PUT") {
    const body = await readJson(req);
    const slug = normalizeSlug(body.slug);
    const target = parseTarget(body.target);
    const slugError = validateSlug(slug);

    if (slugError) {
      return _res.json({ error: "invalid_slug", message: slugError }, 400);
    }
    if (!target) {
      return _res.json({ error: "invalid_target", message: "Enter a valid http(s) URL." }, 400);
    }

    const existingTarget = await store.get(slugKey(slug));
    if (existingTarget && existingTarget !== target) {
      return _res.json(
        { error: "slug_taken", message: "That short name is already in use." },
        409,
      );
    }

    const previousSlug = await store.get(targetKey(target));
    if (previousSlug && previousSlug !== slug) {
      await store.delete(slugKey(previousSlug));
    }

    await store.put(slugKey(slug), target);
    await store.put(targetKey(target), slug);

    return _res.json({ slug, target });
  }

  if (method === "DELETE") {
    const body = await readJson(req);
    const slug = normalizeSlug(body.slug || url.searchParams.get("slug"));
    if (!slug) {
      return _res.json({ message: "slug_required" }, 400);
    }

    const target = await store.get(slugKey(slug));
    await store.delete(slugKey(slug));
    if (target) {
      await store.delete(targetKey(target));
    }

    return _res.json({ slug, deleted: true });
  }

  return _res.json({ message: "method_not_allowed" }, 405);
}
