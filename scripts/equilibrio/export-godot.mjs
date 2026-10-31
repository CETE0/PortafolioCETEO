#!/usr/bin/env node
/** Isolated export: never opens/imports/modifies the original Godot project. No npm dependencies. */
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, inflateRawSync } from "node:zlib";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "godot");
const generated = join(source, ".generated");
const work = join(generated, "project");
const output = resolve(here, "../../public/equilibrio/godot");
const original =
  process.env.EQUILIBRIO_GODOT_SOURCE || "/Users/teo/Proyectos/GODOT/dither";
const godot =
  process.env.GODOT_BIN || "/Applications/Godot.app/Contents/MacOS/Godot";
const version = "4.5.1.stable";
const checkOnly = process.argv.includes("--check-only");

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited ${result.status}`);
  if (
    /SCRIPT ERROR:|Parse Error:|Failed to load script/.test(
      `${result.stdout}\n${result.stderr}`,
    )
  ) {
    throw new Error(
      "Godot reported a script error despite a successful process exit",
    );
  }
}

// The local install may contain only desktop templates. Fetch ONLY the web release ZIP
// via byte ranges in the official 1.35 GB archive (normally ~20 MB transferred).
async function webTemplate() {
  if (process.env.GODOT_WEB_TEMPLATE)
    return resolve(process.env.GODOT_WEB_TEMPLATE);
  const installed = join(
    homedir(),
    "Library/Application Support/Godot/export_templates",
    version,
    "web_nothreads_release.zip",
  );
  if (existsSync(installed)) return installed;
  const cached = join(generated, "templates/web_nothreads_release.zip");
  if (existsSync(cached)) return cached;
  const url =
    "https://github.com/godotengine/godot-builds/releases/download/4.5.1-stable/Godot_v4.5.1-stable_export_templates.tpz";
  console.log(
    "Missing local web template; retrieving just web_nothreads_release.zip from official Godot release…",
  );
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) throw new Error(`Template HEAD failed: ${head.status}`);
  const size = Number(head.headers.get("content-length"));
  if (!Number.isSafeInteger(size) || size < 22)
    throw new Error("Unknown template archive size");
  const remote = head.url;
  async function range(start, end) {
    const response = await fetch(remote, {
      headers: { Range: `bytes=${start}-${end}` },
    });
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new Error(
        `Server did not honor ZIP byte range (${response.status}); provide GODOT_WEB_TEMPLATE`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== end - start + 1)
      throw new Error("Unexpected template byte range length");
    return bytes;
  }
  const tail = await range(size - 65557, size - 1);
  let eocd = tail.length - 22;
  while (eocd >= 0 && tail.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Cannot find ZIP central directory");
  const centralSize = tail.readUInt32LE(eocd + 12);
  const centralOffset = tail.readUInt32LE(eocd + 16);
  const central = await range(centralOffset, centralOffset + centralSize - 1);
  for (let offset = 0; offset < central.length;) {
    if (central.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("Bad ZIP entry");
    const method = central.readUInt16LE(offset + 10);
    const length = central.readUInt32LE(offset + 20);
    const nameLength = central.readUInt16LE(offset + 28);
    const extraLength = central.readUInt16LE(offset + 30);
    const commentLength = central.readUInt16LE(offset + 32);
    const localOffset = central.readUInt32LE(offset + 42);
    const name = central.toString(
      "utf8",
      offset + 46,
      offset + 46 + nameLength,
    );
    if (name.endsWith("/web_nothreads_release.zip")) {
      const header = await range(localOffset, localOffset + 29);
      const dataStart =
        localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
      const compressed = await range(dataStart, dataStart + length - 1);
      const bytes =
        method === 0
          ? compressed
          : method === 8
            ? inflateRawSync(compressed)
            : null;
      if (!bytes) throw new Error(`Unsupported ZIP method ${method}`);
      await mkdir(dirname(cached), { recursive: true });
      await writeFile(cached, bytes);
      console.log(
        `Cached web template: ${bytes.length.toLocaleString()} bytes`,
      );
      return cached;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("No single-threaded web release template in archive");
}

await mkdir(generated, { recursive: true });
await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
for (const name of [
  "project.godot",
  "equilibrio.tscn",
  "equilibrio.gd",
  "ascii.gdshader",
  "shell.html",
  "Personaje",
]) {
  await cp(join(source, name), join(work, name), { recursive: true });
}
// Copy verbatim: scene transforms, original extension tracks, spring animator and dither.
for (const asset of [
  "Personaje/Picaro.tscn",
  "Personaje/animador_picaro.gd",
  "Render/dither_2d.gdshader",
]) {
  await mkdir(dirname(join(work, asset)), { recursive: true });
  await cp(join(original, asset), join(work, asset));
}
for (const name of ["Base", "Caja", "Tubo"]) {
  for (const extension of ["obj", "mtl", "obj.import"]) {
    const asset = `Recursos Imagen/PICARO/${name}.${extension}`;
    await mkdir(dirname(join(work, asset)), { recursive: true });
    await cp(join(original, asset), join(work, asset));
  }
}
run(godot, ["--headless", "--path", work, "--editor", "--import"]);
run(godot, [
  "--headless",
  "--path",
  work,
  "--quit-after",
  "120",
  "--",
  "--demo",
]);
if (!checkOnly) {
  const template = await webTemplate();
  const preset = `[preset.0]\nname="Web"\nplatform="Web"\nrunnable=true\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter="shell.html,export_presets.cfg"\nexport_path=${JSON.stringify(join(output, "index.html"))}\n\n[preset.0.options]\ncustom_template/release=${JSON.stringify(template)}\nvariant/extensions_support=false\nvariant/thread_support=false\nvram_texture_compression/for_desktop=true\nvram_texture_compression/for_mobile=false\nhtml/export_icon=false\nhtml/custom_html_shell="res://shell.html"\nhtml/head_include=""\nhtml/canvas_resize_policy=2\nhtml/focus_canvas_on_start=false\nhtml/experimental_virtual_keyboard=false\nprogressive_web_app/enabled=false\n`;
  await writeFile(join(work, "export_presets.cfg"), preset);
  await mkdir(output, { recursive: true });
  run(godot, [
    "--headless",
    "--path",
    work,
    "--export-release",
    "Web",
    join(output, "index.html"),
  ]);
  // No PWA, threaded worker or splash files should be published.
  for (const name of await readdir(output)) {
    if (
      ![
        "index.html",
        "index.js",
        "index.wasm",
        "index.pck",
        "index.audio.worklet.js",
        "index.audio.position.worklet.js",
      ].includes(name)
    ) {
      await rm(join(output, name), { recursive: true, force: true });
    }
  }
  // Cloudflare assets are limited to 25 MiB; the stock engine is ~38 MB.
  // Keep it gzip-compressed at rest and stream-decompress inside the isolated iframe.
  // This works in both Vite and Workers without custom Content-Encoding headers.
  const enginePath = join(output, "index.js");
  const engineSource = await readFile(enginePath, "utf8");
  const fetchCall = "return fetch(file).then(function (response) {";
  if (engineSource.split(fetchCall).length !== 2)
    throw new Error(
      "Unexpected Godot preloader: review compressed loader integration",
    );
  await writeFile(
    enginePath,
    engineSource.replace(
      fetchCall,
      "return window.__equilibrioFetch(file).then(function (response) {",
    ),
  );
  await writeFile(
    join(output, "index.wasm.gz"),
    gzipSync(await readFile(join(output, "index.wasm")), { level: 9 }),
  );
  await rm(join(output, "index.wasm"));
  let total = 0;
  for (const name of await readdir(output)) {
    const { size } = await stat(join(output, name));
    total += size;
    console.log(`${name}: ${size.toLocaleString()} bytes`);
  }
  console.log(`Total export: ${total.toLocaleString()} bytes`);
}
// Guard the two preservation requirements against accidental future transformations.
for (const asset of ["Personaje/Picaro.tscn", "Personaje/animador_picaro.gd"]) {
  if (
    !(await readFile(join(original, asset))).equals(
      await readFile(join(work, asset)),
    )
  ) {
    throw new Error(`Original asset changed during export: ${asset}`);
  }
}
console.log(`Isolated project: ${work}`);
