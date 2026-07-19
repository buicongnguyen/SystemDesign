import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const defaultPort = Number(process.env.PORT || 43129);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

export async function createAtlasServer({ rootDirectory = process.cwd() } = {}) {
  const root = await realpath(rootDirectory);

  function assertInsideRoot(candidate) {
    const offset = relative(root, candidate);
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
      throw new Error("Invalid path");
    }
  }

  return createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const requestedFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const candidate = resolve(root, requestedFile);
      assertInsideRoot(candidate);
      const info = await stat(candidate);
      const file = await realpath(info.isDirectory() ? resolve(candidate, "index.html") : candidate);
      assertInsideRoot(file);
      response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      response.end(await readFile(file));
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
