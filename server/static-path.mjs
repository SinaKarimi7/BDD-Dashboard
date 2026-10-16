const SAFE = /^\/[A-Za-z0-9._/-]*$/;

export function staticRel(urlPath) {
  if (typeof urlPath !== "string" || !SAFE.test(urlPath)) return null;
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const parts = rel.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return rel;
}
