import axios from "axios";
import { normalizeSlug, validateSlug } from "./shortSlug.js";

export function prepareShortLink(slugInput, target) {
  const slug = normalizeSlug(slugInput);
  if (!slug) {
    return { skipped: true };
  }

  const error = validateSlug(slug);
  if (error) {
    return { error };
  }

  if (!target) {
    return { error: "This file does not have a public URL yet." };
  }

  return { slug, target };
}

export async function saveShortLink(slugInput, target, expiresAt = null) {
  const prepared = prepareShortLink(slugInput, target);
  if (prepared.skipped) {
    return prepared;
  }
  if (prepared.error) {
    return prepared;
  }

  try {
    const res = await axios.put("/api/shortlink", {
      slug: prepared.slug,
      target: prepared.target,
      expiresAt: expiresAt || null,
    });
    return { slug: res.data.slug, target: res.data.target };
  } catch (err) {
    return {
      error: err.response?.data?.message || "Could not save that short name.",
    };
  }
}

export async function slugIsTaken(slugInput) {
  const slug = normalizeSlug(slugInput);
  const error = validateSlug(slug);
  if (!slug || error) {
    return { taken: false, error: error || "" };
  }

  try {
    const res = await axios.get("/api/shortlink", {
      params: { slug },
      validateStatus: (status) => status < 500,
    });
    if (res.status === 200 && res.data?.target) {
      return { taken: true, slug, error: "That short name is already in use." };
    }
    return { taken: false, slug };
  } catch (err) {
    if (err.response?.status === 503) {
      return {
        taken: false,
        slug,
        error: err.response.data?.message || "Short links are not available yet.",
      };
    }
    return { taken: false, slug };
  }
}
