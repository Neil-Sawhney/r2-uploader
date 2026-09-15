import axios from "axios";
import { DEFAULT_EXPIRY_PRESET, expiresAtFromPreset, parseExpiresAt } from "./expiry.js";

export async function fetchExpiryIndex() {
  try {
    const res = await axios.get("/api/expiry", {
      validateStatus: (status) => status < 500,
    });
    if (res.status === 200 && Array.isArray(res.data?.items)) {
      return res.data.items;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveExpiry({ key, target, preset, expiresAt, size }) {
  const resolved =
    expiresAt !== undefined ? parseExpiresAt(expiresAt) : expiresAtFromPreset(preset);

  try {
    const res = await axios.put("/api/expiry", {
      key,
      target,
      expiresAt: resolved,
      preset: preset || DEFAULT_EXPIRY_PRESET,
      size: size || 0,
    });
    return res.data;
  } catch (err) {
    return {
      error: err.response?.data?.message || "Could not save expiry.",
    };
  }
}

export async function deleteExpiry(key, target) {
  if (!key) {
    return;
  }
  try {
    await axios.delete("/api/expiry", {
      data: { key, target: target || "" },
    });
  } catch {
    // Expiry cleanup is best-effort; R2 delete is the source of truth for the object.
  }
}

export async function requestPrune() {
  try {
    const res = await axios.post("/api/prune", null, {
      validateStatus: (status) => status < 500,
      timeout: 15000,
    });
    if (res.status === 200 && Array.isArray(res.data?.expired)) {
      return res.data.expired;
    }
    return [];
  } catch {
    return [];
  }
}
