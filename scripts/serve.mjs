import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { publicFiles } from "./site-files.mjs";

const defaultPort = Number(process.env.PORT || 43129);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const allowedFiles = new Set(publicFiles.map(file => file.replaceAll("\\", "/")));
const allowedHost = /^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/i;

export async function createAtlasServer({ rootDirectory = process.cwd() } = {}) {
  const root = await realpath(rootDirectory);

  function assertInsideRoot(candidate) {
    const offset = relative(root, candidate);
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
      throw new Error("Invalid path");
    }
  }

  return createServer(async (request, response) => {
    if (!allowedHost.test(request.headers.host || "")) {
      response.writeHead(421, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Misdirected request");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "Allow": "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const requestedFile = (pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "")).replaceAll("\\", "/");
      if (!allowedFiles.has(requestedFile)) throw new Error("File is not public");
      const candidate = resolve(root, requestedFile);
      assertInsideRoot(candidate);
      const info = await lstat(candidate);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("Public path is not a regular file");
      const file = await realpath(candidate);
      assertInsideRoot(file);
      const body = await readFile(file);
      response.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Content-Length": body.byteLength,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

export async function listenAtlasServer({ rootDirectory = process.cwd(), port = defaultPort } = {}) {
  const server = await createAtlasServer({ rootDirectory });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(port, "127.0.0.1", resolveListening);
  });
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await listenAtlasServer({ port: defaultPort });
  console.log(`System Design Atlas: http://127.0.0.1:${defaultPort}`);
}
