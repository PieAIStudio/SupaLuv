/**
 * Vercel Services keeps the public mount prefix in the Node request path.
 * Local development already sends canonical service paths, so normalize only
 * the exact `/api` mount and preserve every other path unchanged.
 */
export function normalizeAiBranchServiceUrl(requestUrl: URL): URL {
  const normalized = new URL(requestUrl);

  if (normalized.pathname === "/api" || normalized.pathname === "/api/") {
    normalized.pathname = "/api";
  } else if (normalized.pathname.startsWith("/api/")) {
    normalized.pathname = normalized.pathname.slice(4);
  }

  // Keep the established browser contract without duplicating a health route
  // inside the product-facing AI namespace.
  if (normalized.pathname === "/ai/health") {
    normalized.pathname = "/health";
  }

  return normalized;
}
