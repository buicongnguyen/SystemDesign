import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import {
  createPinnedLookup,
  privateAddress,
  requestExternalLink
} from "../scripts/external-link-core.mjs";
import {
  assertInside,
  assertNotSymbolicLink,
  assertRegularNonSymlinkFile,
  resolveContainedPath
} from "../scripts/path-safety.mjs";
import {
  matchesSourceRequirement,
  parseSourceRequirement
} from "../scripts/source-provenance.mjs";

const publicAddress = "93.184.216.34";
const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
const logicTest = invokedPath === import.meta.url ? test : () => {};

function publicLookup(counter, addresses = [publicAddress]) {
  return async hostname => {
    counter.push(hostname);
    return addresses.map(address => ({ address, family: address.includes(":") ? 6 : 4 }));
  };
}

logicTest("external-link redirects reject HTTPS downgrade before another request", async () => {
  const lookups = [];
  let transports = 0;
  await assert.rejects(
    requestExternalLink("https://public.example/start", {
      lookup: publicLookup(lookups),
      transport: async () => {
        transports += 1;
        return { status: 302, location: "http://public.example/downgrade" };
      }
    }),
    /Unsafe external-link target/
  );
  assert.equal(transports, 1);
  assert.deepEqual(lookups, ["public.example"]);
});

logicTest("external-link redirects reject a newly resolved private destination", async () => {
  const lookups = [];
  let transports = 0;
  const lookup = async hostname => {
    lookups.push(hostname);
    return [{ address: hostname === "private.example" ? "10.0.0.7" : publicAddress, family: 4 }];
  };
  await assert.rejects(
    requestExternalLink("https://public.example/start", {
      lookup,
      transport: async () => {
        transports += 1;
        return { status: 302, location: "https://private.example/secret" };
      }
    }),
    /resolves to a non-public address/
  );
  assert.equal(transports, 1);
  assert.deepEqual(lookups, ["public.example", "private.example"]);
});

logicTest("external-link redirect count is bounded", async () => {
  const lookups = [];
  let transports = 0;
  await assert.rejects(
    requestExternalLink("https://public.example/start", {
      lookup: publicLookup(lookups),
      maximumRedirects: 2,
      transport: async url => {
        transports += 1;
        return { status: 302, location: new URL(`/hop-${transports}`, url).href };
      }
    }),
    /exceeded 2 redirects/
  );
  assert.equal(transports, 3);
  assert.equal(lookups.length, 3);
});

logicTest("one deadline covers the complete redirect attempt", { timeout: 1_000 }, async () => {
  const lookups = [];
  await assert.rejects(
    requestExternalLink("https://public.example/start", {
      lookup: publicLookup(lookups),
      timeoutMilliseconds: 25,
      transport: async () => new Promise(() => {})
    }),
    error => error?.name === "TimeoutError"
  );
  assert.equal(lookups.length, 1);
});

logicTest("every redirect hop is freshly resolved and its vetted address is passed to transport", async () => {
  const lookupAddresses = ["93.184.216.34", "142.250.72.14"];
  const lookups = [];
  const transportedAddresses = [];
  const signals = [];
  let hop = 0;
  const status = await requestExternalLink("https://public.example/start", {
    lookup: async hostname => {
      lookups.push(hostname);
      const address = lookupAddresses[Math.min(hop, lookupAddresses.length - 1)];
      return [{ address, family: 4 }];
    },
    transport: async (_url, options) => {
      transportedAddresses.push(options.addresses.map(entry => entry.address));
      signals.push(options.signal);
      hop += 1;
      return hop === 1 ? { status: 302, location: "/finish" } : { status: 200 };
    }
  });
  assert.equal(status, 200);
  assert.deepEqual(lookups, ["public.example", "public.example"]);
  assert.deepEqual(transportedAddresses, [["93.184.216.34"], ["142.250.72.14"]]);
  assert.equal(signals[0], signals[1], "all redirect hops must share one attempt deadline");
});

logicTest("pinned lookup returns only pre-vetted addresses and refuses another hostname", async () => {
  const lookup = createPinnedLookup("public.example", [
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
  ]);
  const all = await new Promise((resolvePromise, rejectPromise) => {
    lookup("public.example", { all: true }, (error, addresses) => error ? rejectPromise(error) : resolvePromise(addresses));
  });
  assert.deepEqual(all, [
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
  ]);
  await assert.rejects(new Promise((resolvePromise, rejectPromise) => {
    lookup("other.example", {}, error => error ? rejectPromise(error) : resolvePromise());
  }), /unexpected hostname/);
});

logicTest("public-address guard rejects special IPv6 routes and permits global unicast", () => {
  for (const address of [
    "::",
    "::1",
    "::192.168.1.10",
    "::ffff:93.184.216.34",
    "64:ff9b::192.168.1.10",
    "100::1",
    "2001:2::1",
    "2001:db8::1",
    "2002:c0a8:0101::1",
    "3fff::1",
    "fc00::1",
    "fe80::1",
    "ff02::1"
  ]) {
    assert.equal(privateAddress(address), true, `${address} must not be treated as public`);
  }
  for (const address of ["2001:4860:4860::8888", "2606:4700:4700::1111"]) {
    assert.equal(privateAddress(address), false, `${address} must remain valid global unicast`);
  }
});

logicTest("path containment rejects absolute and escaping entries", () => {
  const root = resolveContainedPath(process.cwd(), "sandbox", "Sandbox");
  assert.equal(resolveContainedPath(root, "assets/card.png", "Asset"), resolve(root, "assets/card.png"));
  assert.throws(() => resolveContainedPath(root, "../escape.txt", "Asset"), /escapes its allowed root/);
  assert.throws(() => resolveContainedPath(root, process.cwd(), "Asset"), /must be relative/);
  assert.throws(() => assertInside(root, resolveContainedPath(process.cwd(), "elsewhere", "Elsewhere"), "Candidate"), /escapes its allowed root/);
});

logicTest("path guards reject symbolic links and non-regular files", () => {
  const symbolicFile = { isFile: () => true, isSymbolicLink: () => true };
  const directory = { isFile: () => false, isSymbolicLink: () => false };
  const regularFile = { isFile: () => true, isSymbolicLink: () => false };
  assert.throws(() => assertNotSymbolicLink(symbolicFile, "Output"), /must not be a symbolic link/);
  assert.throws(() => assertRegularNonSymlinkFile(symbolicFile, "Source"), /regular non-symlink file/);
  assert.throws(() => assertRegularNonSymlinkFile(directory, "Source"), /regular non-symlink file/);
  assert.doesNotThrow(() => assertRegularNonSymlinkFile(regularFile, "Source"));
});

logicTest("source provenance requires the authoritative host and path prefix", () => {
  assert.equal(
    matchesSourceRequirement(
      "https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/",
      "nasa.gov/reference/appendix-c-how-to-write-a-good-requirement"
    ),
    true
  );
  assert.equal(matchesSourceRequirement("https://attacker.example/nasa.gov/reference/appendix-c", "nasa.gov"), false);
  assert.equal(matchesSourceRequirement("https://nasa.gov.attacker.example/reference/appendix-c", "nasa.gov"), false);
  assert.equal(matchesSourceRequirement("http://nasa.gov/reference/appendix-c", "nasa.gov"), false);
  assert.throws(() => parseSourceRequirement("appendix-c-how-to-write-a-good-requirement"), /explicit hostname/);
});
