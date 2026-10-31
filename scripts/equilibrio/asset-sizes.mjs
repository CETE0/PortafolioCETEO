import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../..");
const assetDirectory = resolve(root, "dist/client/assets");
const files = await readdir(assetDirectory);
const entry = files.find((name) => /^ThreeStudy-.*\.js$/.test(name));
if (!entry) throw new Error("Run npm run build first.");

// Follow the real emitted imports: shared appearance/simulation chunks can move
// between builds and must not disappear from the accounting after code splitting.
async function dependencies(name, result = new Set(), exclude = () => false) {
  if (result.has(name) || exclude(name)) return result;
  result.add(name);
  const source = await readFile(resolve(assetDirectory, name), "utf8");
  for (const match of source.matchAll(
    /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.\/[^"']+\.js)["']/g,
  )) {
    await dependencies(match[1].slice(2), result, exclude);
  }
  return result;
}
const row = async (path) => {
  const bytes = await readFile(resolve(root, path));
  return {
    path,
    rawBytes: bytes.length,
    gzipBytes: path.endsWith(".gz")
      ? bytes.length
      : gzipSync(bytes, { level: 9 }).length,
  };
};
const rendererChunks = await dependencies(entry);
const native = await Promise.all(
  [
    ...[...rendererChunks].map((name) => `dist/client/assets/${name}`),
    ...["Base", "Caja", "Tubo"].map(
      (name) => `public/equilibrio/models/${name}.obj`,
    ),
  ].map(row),
);
const landingEntry = files.find((name) =>
  /^EquilibrioLanding-.*\.js$/.test(name),
);
const landingChunks = landingEntry
  ? await dependencies(landingEntry, new Set(), (name) =>
      /^(index-|jsx-runtime-)/.test(name),
    )
  : new Set();
const landingOnly = await Promise.all(
  [...landingChunks]
    .filter((name) => !rendererChunks.has(name))
    .map((name) => row(`dist/client/assets/${name}`)),
);
const godotFiles = await readdir(
  resolve(root, "public/equilibrio/godot"),
).catch((error) => {
  if (error.code === "ENOENT") return [];
  throw error;
});
const godot = await Promise.all(
  godotFiles
    .filter((name) => !name.startsWith("."))
    .map((name) => row(`public/equilibrio/godot/${name}`)),
);
const summarize = (files) => ({
  files,
  rawBytes: files.reduce((n, file) => n + file.rawBytes, 0),
  gzipBytes: files.reduce((n, file) => n + file.gzipBytes, 0),
});
const report = {
  measuredAt: new Date().toISOString(),
  note: "Scene payloads excluding the shared portfolio/React/router shell. Three follows the full emitted renderer dependency graph plus original OBJ files. Landing also includes the native landing/controls module, excluding shared index/jsx-runtime chunks. Gzip is a level-9 estimate, not a claim about actual HTTP encoding. A .gz file is already compressed; its raw size is its stored transport payload. Godot is null if its optional local export has not been built.",
  three: summarize(native),
  landing: landingEntry ? summarize([...native, ...landingOnly]) : null,
  godot: godot.length ? summarize(godot) : null,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv[2])
  await writeFile(
    resolve(process.argv[2]),
    JSON.stringify(report, null, 2) + "\n",
  );
