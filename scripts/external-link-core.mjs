import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export function privateIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [a, b, c] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

export function privateAddress(address) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const family = isIP(normalized);
  if (family === 4) return privateIpv4(normalized);
  if (family !== 6) return true;
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("::ffff:")
    || /^f[cd]/.test(normalized)
    || /^fe[89a-f]/.test(normalized)
    || normalized.startsWith("ff")
    || normalized.startsWith("2001:db8:");
}

function abortError(signal) {
  if (signal?.reason) return signal.reason;
  const error = new Error("Operation aborted");
  error.name = "AbortError";
  return error;
}

async function withSignal(value, signal) {
  if (!signal) return value;
  if (signal.aborted) throw abortError(signal);

  return new Promise((resolvePromise, rejectPromise) => {
    const onAbort = () => rejectPromise(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(value).then(
      result => {
        signal.removeEventListener("abort", onAbort);
        resolvePromise(result);
      },
      error => {
        signal.removeEventListener("abort", onAbort);
        rejectPromise(error);
      }
    );
  });
}

function normalizedHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function nonPublicHostname(hostname) {
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname.endsWith(".home.arpa");
}

function normalizedAddresses(entries) {
  const addresses = (Array.isArray(entries) ? entries : [entries]).map(entry => {
    const address = typeof entry === "string" ? entry : entry?.address;
    const family = typeof entry === "string" ? isIP(entry) : Number(entry?.family || isIP(address || ""));
    if (!address || (family !== 4 && family !== 6)) {
      throw new Error("External-link DNS lookup returned an invalid address");
    }
    return Object.freeze({ address, family });
  });
  if (!addresses.length) throw new Error("External-link DNS lookup returned no addresses");
  return Object.freeze(addresses);
}

export async function assertPublicHttps(target, { lookup = dnsLookup, signal } = {}) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`Unsafe external-link target: ${url.href}`);
  }

  const hostname = normalizedHostname(url.hostname);
  if (!hostname || nonPublicHostname(hostname)) {
    throw new Error(`Non-public external-link host: ${hostname || "(empty)"}`);
  }

  const literalFamily = isIP(hostname);
  const resolved = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await withSignal(lookup(hostname, { all: true, verbatim: true }), signal);
  const addresses = normalizedAddresses(resolved);
  if (addresses.some(entry => privateAddress(entry.address))) {
    throw new Error(`External-link host resolves to a non-public address: ${hostname}`);
  }

  return Object.freeze({ url, hostname, addresses });
}

export function createPinnedLookup(hostname, addresses) {
  const expectedHostname = normalizedHostname(hostname);
  const vettedAddresses = normalizedAddresses(addresses);

  return (requestedHostname, options, callback) => {
    let lookupOptions = options;
    let done = callback;
    if (typeof options === "function") {
      done = options;
      lookupOptions = {};
    } else if (typeof options === "number") {
      lookupOptions = { family: options };
    }

    const requested = normalizedHostname(requestedHostname);
    if (requested !== expectedHostname) {
      const error = new Error(`Pinned lookup refused unexpected hostname ${requested}`);
      error.code = "ENOTFOUND";
      queueMicrotask(() => done(error));
      return;
    }

    const requestedFamily = Number(lookupOptions?.family || 0);
    const candidates = requestedFamily
      ? vettedAddresses.filter(entry => entry.family === requestedFamily)
      : vettedAddresses;
    if (!candidates.length) {
      const error = new Error(`No vetted address matches family ${requestedFamily}`);
      error.code = "EAI_ADDRFAMILY";
      queueMicrotask(() => done(error));
      return;
    }

    if (lookupOptions?.all) {
      queueMicrotask(() => done(null, candidates.map(entry => ({ ...entry }))));
      return;
    }
    queueMicrotask(() => done(null, candidates[0].address, candidates[0].family));
  };
}

export function pinnedHttpsTransport(url, { addresses, headers, signal }) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    const request = httpsRequest(url, {
      agent: false,
      headers,
      lookup: createPinnedLookup(url.hostname, addresses),
      method: "GET",
      signal
    }, response => {
      const status = response.statusCode;
      const location = response.headers.location;
      response.on("error", error => settle(rejectPromise, error));
      response.destroy();
      if (!Number.isInteger(status)) {
        settle(rejectPromise, new Error(`External link returned no HTTP status: ${url.href}`));
        return;
      }
      settle(resolvePromise, { status, location });
    });

    request.on("error", error => settle(rejectPromise, error));
    request.end();
  });
}

export async function requestExternalLink(source, {
  headers = {},
  lookup = dnsLookup,
  maximumRedirects = 8,
  timeoutMilliseconds = 20_000,
  transport = pinnedHttpsTransport
} = {}) {
  if (!Number.isInteger(maximumRedirects) || maximumRedirects < 0) {
    throw new TypeError("maximumRedirects must be a non-negative integer");
  }
  if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
    throw new TypeError("timeoutMilliseconds must be a positive integer");
  }

  const signal = AbortSignal.timeout(timeoutMilliseconds);
  let current = source instanceof URL ? source : new URL(source);

  for (let redirectCount = 0; ; redirectCount += 1) {
    const resolved = await assertPublicHttps(current, { lookup, signal });
    const response = await withSignal(transport(resolved.url, {
      addresses: resolved.addresses,
      headers,
      signal
    }), signal);

    if (!redirectStatuses.has(response.status)) return response.status;
    if (!response.location) throw new Error(`Redirect response omitted Location: ${resolved.url.href}`);
    if (redirectCount === maximumRedirects) {
      throw new Error(`External link exceeded ${maximumRedirects} redirects`);
    }
    current = new URL(response.location, resolved.url);
  }
}
