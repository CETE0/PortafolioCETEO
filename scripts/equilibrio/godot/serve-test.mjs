#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../public');
const types = {'.html':'text/html','.js':'application/javascript','.wasm':'application/wasm','.pck':'application/octet-stream'};
createServer(async (request,response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const path = pathname === '/' ? resolve(here, 'test-host.html') : resolve(root, `.${decodeURIComponent(pathname)}`);
  if (pathname !== '/' && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(path);
    response.writeHead(200, {'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(bytes);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4179, '127.0.0.1', () => console.log('Godot test host: http://127.0.0.1:4179 (no isolation headers)'));
