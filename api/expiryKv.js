import {
  EXPIRY_INDEX_KEY,
  EXPIRY_LAST_PRUNE_KEY,
  PRUNE_BATCH_LIMIT,
  PRUNE_THROTTLE_MS,
  expiryObjectKey,
  expiryUrlKey,
  isExpired,
  kvExpirationOptions,
  parseExpiresAt,
} from "../src/utils/expiry.js";
import { slugKey, targetKey } from "../src/utils/shortSlug.js";

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.items)) {
    return value.items;
  }
  return [];
}

export async function readExpiryIndex(store) {
  const raw = await store.get(EXPIRY_INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    return asArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function writeExpiryIndex(store, items) {
  const next = items
    .filter((item) => item?.key && parseExpiresAt(item.expiresAt))
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .map((item) => ({
      key: item.key,
      expiresAt: item.expiresAt,
      target: item.target || "",
    }));
  await store.put(EXPIRY_INDEX_KEY, JSON.stringify(next));
  return next;
}

export async function readExpiryMeta(store, objectKey) {
  if (!objectKey) {
    return null;
  }
  const raw = await store.get(expiryObjectKey(objectKey));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function deleteShortLinkForTarget(store, target) {
  if (!target) {
    return;
  }
  const slug = await store.get(targetKey(target));
  if (slug) {
    await store.delete(slugKey(slug));
    await store.delete(targetKey(target));
  }
}

export async function putShortLinkRecord(store, slug, target, expiresAt) {
  const options = kvExpirationOptions(expiresAt);
  await store.put(slugKey(slug), target, options);
  await store.put(targetKey(target), slug, options);
}

async function refreshShortLinkTtl(store, target, expiresAt) {
  if (!target) {
    return;
  }
  const slug = await store.get(targetKey(target));
  if (!slug) {
    return;
  }
  if (isExpired(expiresAt)) {
    await deleteShortLinkForTarget(store, target);
    return;
  }
  await putShortLinkRecord(store, slug, target, expiresAt);
}

export async function upsertExpiry(store, input) {
  const key = String(input.key || "").trim();
  if (!key) {
    throw new Error("key_required");
  }

  const expiresAt = parseExpiresAt(input.expiresAt);
  const target = String(input.target || "").trim();
  const previous = await readExpiryMeta(store, key);
  const index = await readExpiryIndex(store);

  if (!expiresAt) {
    await store.delete(expiryObjectKey(key));
    if (previous?.target) {
      await store.delete(expiryUrlKey(previous.target));
      await refreshShortLinkTtl(store, previous.target, null);
    }
    if (target && target !== previous?.target) {
      await store.delete(expiryUrlKey(target));
      await refreshShortLinkTtl(store, target, null);
    }
    await writeExpiryIndex(
      store,
      index.filter((item) => item.key !== key),
    );
    return { key, expiresAt: null, target: target || previous?.target || "" };
  }

  const meta = {
    key,
    expiresAt,
    target: target || previous?.target || "",
    size: Number(input.size) || previous?.size || 0,
    preset: input.preset || previous?.preset || "",
    updatedAt: Date.now(),
  };

  await store.put(expiryObjectKey(key), JSON.stringify(meta));
  if (previous?.target && previous.target !== meta.target) {
    await store.delete(expiryUrlKey(previous.target));
  }
  if (meta.target) {
    await store.put(expiryUrlKey(meta.target), key);
    await refreshShortLinkTtl(store, meta.target, expiresAt);
  }

  const nextIndex = index.filter((item) => item.key !== key);
  nextIndex.push({ key, expiresAt, target: meta.target });
  await writeExpiryIndex(store, nextIndex);
  return meta;
}

export async function removeExpiry(store, objectKey, targetHint = "") {
  const key = String(objectKey || "").trim();
  if (!key) {
    return { key: "", deleted: false };
  }

  const previous = await readExpiryMeta(store, key);
  const target = targetHint || previous?.target || "";

  await store.delete(expiryObjectKey(key));
  if (previous?.target) {
    await store.delete(expiryUrlKey(previous.target));
  }
  if (target && target !== previous?.target) {
    await store.delete(expiryUrlKey(target));
  }
  await deleteShortLinkForTarget(store, target || previous?.target);

  const index = await readExpiryIndex(store);
  await writeExpiryIndex(
    store,
    index.filter((item) => item.key !== key),
  );

  return { key, deleted: true };
}

export async function lookupExpiryByTarget(store, target) {
  if (!target) {
    return null;
  }
  const objectKey = await store.get(expiryUrlKey(target));
  if (!objectKey) {
    return null;
  }
  return readExpiryMeta(store, objectKey);
}

export async function pruneExpired(store, options = {}) {
  const now = options.now || Date.now();
  const limit = options.limit || PRUNE_BATCH_LIMIT;
  const index = await readExpiryIndex(store);
  const expired = [];
  const keep = [];

  for (const item of index) {
    if (expired.length < limit && isExpired(item.expiresAt, now)) {
      expired.push(item);
    } else {
      keep.push(item);
    }
  }

  for (const item of expired) {
    const meta = await readExpiryMeta(store, item.key);
    const target = item.target || meta?.target || "";
    await deleteShortLinkForTarget(store, target);
    // Keep expiry meta + index until the SPA confirms the R2 delete.
  }

  return {
    expired,
    remaining: index.length,
    prunedShortLinks: expired.length,
    now,
  };
}

export async function maybePruneExpired(store) {
  if (!store) {
    return { skipped: true };
  }
  const last = Number((await store.get(EXPIRY_LAST_PRUNE_KEY)) || 0);
  if (last && Date.now() - last < PRUNE_THROTTLE_MS) {
    return { skipped: true, last };
  }
  await store.put(EXPIRY_LAST_PRUNE_KEY, String(Date.now()));
  return pruneExpired(store);
}
