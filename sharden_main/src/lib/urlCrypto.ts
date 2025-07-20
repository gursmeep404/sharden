export function parseHashForKeyIv(hash: string) {
  // Accept forms: "#k=...&iv=..." OR "#iv=...&k=..." OR "#k=..." (key only)
  const out = { key: "", iv: "" };
  if (!hash) return out;
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  out.key = params.get("k") ? decodeURIComponent(params.get("k")!) : "";
  out.iv = params.get("iv") ? decodeURIComponent(params.get("iv")!) : "";
  // Backward compat (#k=BASE64 no params)
  if (!out.key && trimmed.startsWith("k=")) {
    out.key = decodeURIComponent(trimmed.slice(2));
  } else if (!out.key && trimmed.startsWith("=")) {
    out.key = decodeURIComponent(trimmed.slice(1));
  }
  return out;
}
