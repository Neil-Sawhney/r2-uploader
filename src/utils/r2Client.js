import axios from "axios";

export function r2ObjectUrl(endPoint, key) {
  if (!endPoint) {
    return key;
  }
  if (endPoint[endPoint.length - 1] === "/") {
    return endPoint + key;
  }
  return endPoint + "/" + key;
}

export async function deleteR2Object(key, options = {}) {
  const endPoint = options.endPoint ?? localStorage.getItem("endPoint");
  const apiKey = options.apiKey ?? localStorage.getItem("apiKey");
  if (!endPoint || !apiKey || !key) {
    throw new Error("missing_r2_credentials");
  }

  await axios({
    method: "delete",
    headers: {
      "x-api-key": apiKey,
    },
    url: r2ObjectUrl(endPoint, key),
  });
}
