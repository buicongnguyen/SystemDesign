import { isAbsolute, relative, resolve, sep } from "node:path";

export function assertInside(base, candidate, label) {
  const offset = relative(base, candidate);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`${label} escapes its allowed root`);
  }
}

export function resolveContainedPath(base, entry, label) {
  if (isAbsolute(entry)) throw new Error(`${label} must be relative`);
  const candidate = resolve(base, entry);
  assertInside(base, candidate, label);
  return candidate;
}

export function assertNotSymbolicLink(info, label) {
  if (info.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
}

export function assertRegularNonSymlinkFile(info, label) {
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
}
