import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { publicFiles } from "./site-files.mjs";

const root = resolve(process.cwd());
const output = resolve(root, "_site");
const outputOffset = relative(root, output);

if (outputOffset === ".." || outputOffset.startsWith(`..${sep}`) || isAbsolute(outputOffset)) {
  throw new Error("Refusing to build outside the repository root");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of publicFiles) {
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, file), destination);
}

console.log(`Built ${publicFiles.length} public files in _site/.`);
