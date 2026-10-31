import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

const html = await readFile(
  new URL("../equilibrio/godot/shell.html", import.meta.url),
  "utf8",
);
const bridge = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const wasm = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);

function loader(response, decompressionAvailable = true) {
  const calls = [];
  const window = {
    fetch: async (url) => {
      calls.push(url);
      return response;
    },
    parent: { postMessage() {} },
    location: { origin: "http://localhost" },
    addEventListener() {},
  };
  if (decompressionAvailable) window.DecompressionStream = DecompressionStream;
  runInNewContext(bridge, { window, Response, DecompressionStream });
  return { fetch: window.__equilibrioFetch, calls };
}

test("Godot loader decompresses a stored gzip file without Content-Encoding (Workers)", async () => {
  const subject = loader(
    new Response(gzipSync(wasm), {
      headers: { "content-type": "application/gzip" },
    }),
  );
  const response = await subject.fetch("index.wasm");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wasm);
  assert.deepEqual(subject.calls, ["index.wasm.gz"]);
});

test("Godot loader does not decompress again when HTTP already decoded gzip (Vite)", async () => {
  // Fetch automatically decodes this header before exposing the response body.
  const subject = loader(
    new Response(wasm, { headers: { "content-encoding": "gzip" } }),
  );
  const response = await subject.fetch("index.wasm");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wasm);
});

test("HTTP-decoded WASM works even without DecompressionStream", async () => {
  const subject = loader(
    new Response(wasm, { headers: { "content-encoding": "gzip" } }),
    false,
  );
  const response = await subject.fetch("index.wasm");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wasm);
});

test("non-WASM resources are fetched unchanged", async () => {
  const subject = loader(new Response("pack"));
  assert.equal(await (await subject.fetch("index.pck")).text(), "pack");
  assert.deepEqual(subject.calls, ["index.pck"]);
});
