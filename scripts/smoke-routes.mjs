// Usage: node scripts/smoke-routes.mjs http://localhost:3000 [out.tsv]
import { writeFileSync } from 'node:fs'
import { projects } from '../src/lib/projects.js'
import { SITE } from '../src/data/site.ts'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const out = process.argv[3]

const routes = [
  ['/', 200],
  ['/contact', 200],
  ['/texts/statement', 200],
  ['/experimental', 200],
  ['/experimental/coinpush', 200],
  ['/experimental/empuja-monedas', 200],
  ...Object.entries(projects).flatMap(([category, items]) =>
    Object.keys(items).map((id) => [`/${category}/${encodeURIComponent(id)}`, 200]),
  ),
  ['/artworks/does-not-exist', 404],
  ['/favicon.ico', 200],
  ...new Set(
    Object.values(projects)
      .flatMap((items) => Object.values(items))
      .flatMap((project) => project.content)
      .map((item) => item.src)
      .filter((src) => src?.startsWith('/')),
  ),
].map((route) => (Array.isArray(route) ? route : [encodeURI(route), 200]))

const home = await fetch(base).then((r) => r.text(), () => '')
if (!home.includes(`<title>${SITE.name}</title>`)) {
  console.error(`${base} is not serving this site (no <title>${SITE.name}</title>); is another app on that port?`)
  process.exit(2)
}

const rows = []
let failed = 0
for (const [path, expected] of routes) {
  const res = await fetch(base + path, { redirect: 'manual' }).catch((e) => ({ status: `ERR ${e.code ?? e.message}` }))
  const ok = res.status === expected
  if (!ok) failed++
  rows.push([path, expected, res.status, ok ? 'ok' : 'FAIL'].join('\t'))
}

const report = ['path\texpected\tactual\tresult', ...rows].join('\n')
console.log(report)
if (out) writeFileSync(out, report + '\n')
console.log(`\n${routes.length - failed}/${routes.length} routes as expected`)
process.exit(failed ? 1 : 0)
