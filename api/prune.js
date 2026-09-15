import { _res } from "../utils/response.js";
import { pruneExpired } from "./expiryKv.js";

export default async function (req, env) {
  const store = env?.SHORT_LINKS;
  if (!store) {
    return _res.json(
      {
        error: "kv_unbound",
        message:
          "SHORT_LINKS KV is not bound. Create the namespace and bind it (see CLOUDFLARE.md).",
        expired: [],
      },
      503,
    );
  }

  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return _res.json({ message: "method_not_allowed" }, 405);
  }

  const result = await pruneExpired(store);
  return _res.json({
    expired: result.expired,
    prunedShortLinks: result.prunedShortLinks,
    remaining: result.remaining,
  });
}
