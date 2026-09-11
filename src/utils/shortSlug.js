export const RESERVED_SLUGS = new Set([
  "api",
  "setup-guide",
  "assets",
  "favicon.svg",
  "favicon.ico",
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "static",
  "src",
  "public",
  "share",
  "admin",
  "cdn-cgi",
  "wrangler",
]);

export function normalizeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase();
}

export function validateSlug(input) {
  const slug = normalizeSlug(input);
  if (!slug) {
    return "Enter a short name";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return "That name is reserved";
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)) {
    return "Use lowercase letters, numbers, and hyphens";
  }
  return "";
}

export function isReservedPathSegment(segment) {
  return RESERVED_SLUGS.has(normalizeSlug(segment));
}

export function slugKey(slug) {
  return `s:${normalizeSlug(slug)}`;
}

export function targetKey(target) {
  return `t:${target}`;
}

export function shortUrlForSlug(slug, origin = "") {
  const base = (origin || "").replace(/\/+$/, "");
  return `${base}/${normalizeSlug(slug)}`;
}
