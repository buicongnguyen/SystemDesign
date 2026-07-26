import { copyFile, lstat, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertInside,
  assertNotSymbolicLink,
  assertRegularNonSymlinkFile,
  resolveContainedPath
} from "./path-safety.mjs";
import { publicFiles } from "./site-files.mjs";

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const output = resolveContainedPath(root, "_site", "Build output");

assertInside(root, output, "Build output");
try {
  const existingOutput = await lstat(output);
  assertNotSymbolicLink(existingOutput, "Build output");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of publicFiles) {
  const sourceCandidate = resolveContainedPath(root, file, `Public source ${file}`);
  const sourceInfo = await lstat(sourceCandidate);
  assertRegularNonSymlinkFile(sourceInfo, `Public source ${file}`);
  const source = await realpath(sourceCandidate);
  assertInside(root, source, `Public source ${file}`);
  const destination = resolveContainedPath(output, file, `Public destination ${file}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log(`Built ${publicFiles.length} public files in _site/.`);
