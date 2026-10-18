# Mateo Cereceda — Next.js → TanStack Start migration

The code in this package replaces the Next.js app. **`public/` is not included** because it moves over unchanged; all asset URLs stay the same.

## 1 · Set up

```bash
# in the existing repo
git checkout -b tanstack
rm -rf src next.config.js postcss.config.js tailwind.config.mjs jsconfig.json .next
# unzip this package at the repo root (overwrites package.json)
# keep public/ exactly as it is
cp .env.local .env      # then rename vars, see §4
rm package-lock.json && npm install
npm run dev             # http://localhost:3000 (Vite picks the next port if taken)
```

`src/routeTree.gen.ts` is generated on the first `dev`/`build` run. Commit it.

## 2 · What changed

**Rebrand (whole site)**
- CETEO → **Mateo Cereceda**: wordmark, `<title>`s, meta/OG, about text, and every page title (`pageTitle()` in `src/data/site.ts`)
- Tagline "new?-media artist" removed
- Email: `mate.cereceda@gmail.com` · Instagram: `@mateo.cereceda`. Both live in `src/data/site.ts`
- Wordmark set in DM Sans Black (900), all caps, letter-spaced (`Wordmark.tsx`)

**Removed**
- Press Start 2P font (it was used in the image viewer counter and the preloader)
- Image preloader: the DVD-style bouncing indicator, the red/green cache dots, the "Loading high-res…" label, and `lib/imagePreloader.js`
- `next`, `next-intl`, `next-themes`, `next-cloudinary`, `eslint-config-next`, PostCSS/Tailwind v3 config

**Contact page (layout 1d)**
- Name heading, then a label/value list: About, Contact, Social, CV
- The CV is a table with thin lines between rows, toggled by the button; `/contact#cv` opens it directly. On mobile it stacks: info → CV → GIF
- CV data is language-agnostic (`src/data/cv.ts`). "2021 – X" is now "2021 – present/presente"

**Behavior fixes, no visual change**
- The mobile menu is React state in `__root.tsx`; the old version toggled DOM classes and used a `sidebarClosed` event. The games still receive the `mobileMenuState` event
- The sidebar opens the category of the current route instead of always opening ARTWORKS
- `ProjectView`: the hooks-after-early-return bug is fixed, and switching projects resets the gallery index (`key` on the route)
- a11y: `aria-expanded`/`aria-current`/`aria-modal`, translated aria-labels, a real `mailto:` link
- YouTube embeds use `youtube-nocookie.com` and load lazily

## 3 · File map

| Next.js | TanStack Start |
|---|---|
| `app/layout.js` | `routes/__root.tsx` (head/meta, shell, sidebar, mobile menu state) |
| `app/page.js` | `routes/index.tsx` |
| `app/[category]/[project]/page.js` + `layout.js` | `routes/$category.$project.tsx` (loader + `notFound()` + head) |
| `app/contact/*` | `routes/contact.tsx`, `components/contact/ContactInfo.tsx`, `ContactCV.tsx`, `data/cv.ts` |
| `app/texts/statement/page.js` | `routes/texts.statement.tsx` |
| `app/experimental/**` | `routes/experimental.index.tsx`, `experimental.coinpush.tsx`, `experimental.empuja-monedas.tsx` |
| `components/layout/Sidebar.js` | `components/layout/Sidebar.tsx` + `data/navigation.ts` |
| `components/layout/MobileMenu.js` | `components/layout/MobileHeader.tsx` (header + wiggle button) |
| — | `components/layout/Wordmark.tsx` (new) |
| `contexts/LanguageContext.jsx` | `i18n/LanguageContext.tsx` |
| `i18n/dict.js` | `i18n/dict.ts` (+ contact, menu, modal keys) |
| `OptimizedImage.js` (next/image) | `OptimizedImage.tsx` (plain `<img>` + Cloudinary srcset) |
| `next/dynamic({ ssr:false })` | `React.lazy` inside `<ClientOnly>` |
| `next/link`, `usePathname`, `useRouter` | `Link`, `useLocation`, `useNavigate` from `@tanstack/react-router` |
| `next/font/google` | Google Fonts `<link>` in root `head()` |
| `globals.css` + Tailwind v3 | `styles.css` (Tailwind v4, `@tailwindcss/vite`) |
| games (`*.js` with JSX) | renamed to `.jsx` (Vite requires it); three.js addon imports now end in `.js` |
| `scripts/upload-*.js` | `scripts/upload-*.cjs` (package is now ESM) |

Unchanged copies: `lib/projects.js`, `i18n/projects.js`, `lib/cloudinary.js` (only the env var changed), `games/**` logic, `scripts/tests/anim/*`.

## 4 · Environment

| Old | New |
|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `VITE_CLOUDINARY_CLOUD_NAME` |
| `CLOUDINARY_*` (scripts) | unchanged, now read from `.env` |

## 5 · Deploy (Cloudflare Workers)

The app builds straight to a Cloudflare Worker with static assets. There is no Vercel step.

- `vite.config.ts` runs `@cloudflare/vite-plugin` on the SSR environment, so `npm run dev` and `npm run preview` both execute in workerd, the runtime production uses.
- `wrangler.jsonc` names the worker `mateo-cereceda-portfolio` and points `main` at `@tanstack/react-start/server-entry`.
- `public/_headers` gives Vite's content-hashed `/assets/*` a one-year immutable cache. Everything else in `public/` keeps the default revalidating cache because those filenames are stable.
- `npm run build` runs `vite build && tsc --noEmit`, so a type error fails the deploy.
- The worker needs no secrets or bindings. `VITE_CLOUDINARY_CLOUD_NAME` is inlined at build time, so it must be present wherever the build runs (local `.env` or the Workers Builds environment).

First deploy:

```bash
npx wrangler login
npm run deploy            # build + wrangler deploy
```

Then attach the custom domain in the Cloudflare dashboard (Workers & Pages → the worker → Settings → Domains & Routes) and move DNS off Vercel. URLs are unchanged, so no redirects are needed.

## 6 · Verification

- `npm run smoke -- <base-url> [out.tsv]` checks every route, the 404 path, and every local asset referenced in `src/lib/projects.js`. It refuses to run if the URL is serving a different app.
- `npm run test:anim` covers the shooter animation regressions.
- `npx wrangler deploy --dry-run` builds the upload without publishing.

Baseline on the old Next app was 26/28. Unknown projects returned 200 and `/favicon.ico` returned 500 (duplicate in `public/` and `src/app/`). On the Worker it is 72/72 with the asset checks added.

## 7 · Changes made while applying the package

- Vite 7 → 8. Current `@tanstack/react-start` requires Vite 8; `.npmrc`'s `legacy-peer-deps` had hidden the mismatch. `.npmrc` is gone and the install is clean without it.
- `vite-tsconfig-paths` replaced by Vite 8's built-in `resolve.tsconfigPaths`.
- Removed unused `@react-three/*`, `@vimeo/player`, `lucide-react`.
- Removed `TextContentView` and `react-markdown`. No project has a `text` item, so the branch was unreachable.
- `strictNullChecks` on. TanStack Router's types require it; without it route params and loader data are untyped.
- `public/images/Medium/Médium.jpg` → `medium.jpg`. macOS hands the build the NFD spelling while the URL is NFC, so a deploy from a Mac would have 404'd the image.

## 8 · Still open

- [ ] **Contact GIF is 4.1 MB.** Re-encode it to MP4/WebM and swap the `<img>` for `<video autoplay loop muted playsinline>` in `routes/contact.tsx`
- [ ] **Favicon** probably still shows the CETEO mark: replace `public/favicon.ico`
- [ ] **Instagram / Linktree / CVs elsewhere**: update the handle and email outside the site too
- [ ] **Games throw on mount in dev only** (`null.domElement` in the shooter, `null.frames` in the kick game). Same errors on the old Next app; StrictMode's double mount disposes the game before async setup finishes. Production is unaffected.
- [ ] Manually check pointer lock, audio autoplay, and the shooter's `onNavigate` into project pages. Headless checks confirm the canvases render without errors but cannot drive pointer lock.
- [ ] After the Cloudflare cutover, delete the Vercel project and its `NEXT_PUBLIC_*` env vars
