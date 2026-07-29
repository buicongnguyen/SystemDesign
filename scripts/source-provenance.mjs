function normalizedHostname(value) {
  return value.toLowerCase().replace(/\.$/, "");
}

export function parseSourceRequirement(requirement) {
  if (typeof requirement !== "string" || !requirement.trim()) {
    throw new TypeError("Source requirement must be a non-empty host[/path] string");
  }
  const normalized = requirement.trim().toLowerCase().replace(/^https:\/\//, "");
  const separator = normalized.indexOf("/");
  const hostname = normalizedHostname(separator === -1 ? normalized : normalized.slice(0, separator));
  const pathPrefix = separator === -1 ? "/" : `/${normalized.slice(separator + 1)}`;
  if (!hostname.includes(".") || hostname.startsWith(".") || hostname.endsWith(".")) {
    throw new TypeError(`Source requirement needs an explicit hostname: ${requirement}`);
  }
  return Object.freeze({ hostname, pathPrefix });
}

export function matchesSourceRequirement(target, requirement) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== "https:" || url.username || url.password) return false;

  const expected = parseSourceRequirement(requirement);
  const actualHostname = normalizedHostname(url.hostname);
  const hostnameMatches = actualHostname === expected.hostname
    || actualHostname.endsWith(`.${expected.hostname}`);
  if (!hostnameMatches) return false;

  if (expected.pathPrefix === "/") return true;
  const expectedPath = expected.pathPrefix.replace(/\/+$/, "");
  const actualPath = url.pathname.toLowerCase().replace(/\/+$/, "");
  return actualPath === expectedPath || actualPath.startsWith(`${expectedPath}/`);
}
