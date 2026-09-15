export const EXPIRY_PRESETS = [
  { id: "1m", label: "1 minute", ms: 60 * 1000 },
  { id: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { id: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "1w", label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "1mo", label: "1 month", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "never", label: "Never", ms: null },
];

export const DEFAULT_EXPIRY_PRESET = "never";
export const LARGE_FILE_BYTES = 50_000_000;
export const PRUNE_BATCH_LIMIT = 25;
export const PRUNE_THROTTLE_MS = 60_000;

export const EXPIRY_INDEX_KEY = "e:idx";
export const EXPIRY_LAST_PRUNE_KEY = "e:last_prune";

export function expiryObjectKey(objectKey) {
  return `e:obj:${objectKey}`;
}

export function expiryUrlKey(target) {
  return `e:url:${target}`;
}

export function getExpiryPreset(id) {
  return EXPIRY_PRESETS.find((item) => item.id === id) || EXPIRY_PRESETS.at(-1);
}

export function expiresAtFromPreset(presetId, now = Date.now()) {
  const preset = getExpiryPreset(presetId);
  if (!preset || preset.ms == null) {
    return null;
  }
  return now + preset.ms;
}

export function parseExpiresAt(value) {
  if (value == null || value === "" || value === "never") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

export function remainingMs(expiresAt, now = Date.now()) {
  if (!expiresAt) {
    return null;
  }
  return expiresAt - now;
}

export function isExpired(expiresAt, now = Date.now()) {
  return Boolean(expiresAt) && expiresAt <= now;
}

export function formatExpiryLabel(expiresAt, now = Date.now()) {
  if (!expiresAt) {
    return "Never";
  }
  const left = expiresAt - now;
  if (left <= 0) {
    return "Expired";
  }
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (left < minute) {
    return "Soon";
  }
  if (left < hour) {
    return `${Math.round(left / minute)}m`;
  }
  if (left < 2 * day) {
    return `${Math.round(left / hour)}h`;
  }
  return `${Math.round(left / day)}d`;
}

export function kvExpirationOptions(expiresAt, now = Date.now()) {
  if (!expiresAt) {
    return {};
  }
  const unix = Math.floor(expiresAt / 1000);
  const nowUnix = Math.floor(now / 1000);
  if (unix - nowUnix < 60) {
    return {};
  }
  return { expiration: unix };
}

export function sortExpiryValue(expiresAt, mode) {
  if (mode === "never-first") {
    return expiresAt ? expiresAt : Number.NEGATIVE_INFINITY;
  }
  return expiresAt ? expiresAt : Number.POSITIVE_INFINITY;
}
