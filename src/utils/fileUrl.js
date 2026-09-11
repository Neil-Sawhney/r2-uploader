export function filePublicUrl(key, customDomain, endPoint) {
  const domain = customDomain ?? localStorage.getItem("customDomain") ?? "";
  const endpoint = endPoint ?? localStorage.getItem("endPoint") ?? "";
  const base = domain || endpoint || "";
  return `${base}${key ?? ""}`;
}
