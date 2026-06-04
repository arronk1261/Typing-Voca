import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(process.cwd(), "src", specifier.slice(2));
    const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
    const found = candidates.find((p) => existsSync(p));
    if (found) {
      return { url: pathToFileURL(found).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
