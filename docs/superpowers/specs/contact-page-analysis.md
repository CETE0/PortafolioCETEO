# `/contact` Page — Deep Analysis & Structural Improvement Proposals

**Scope:** Understand every specificity of `src/app/contact/page.js` and propose *structural / diagrammatic* improvements that preserve the current visual + design language exactly as-is.

**Explicit constraint:** No visual changes. No color changes. No typography changes. No layout re-spacing. Only internal restructuring, data-flow cleanup, semantic/accessibility improvements, and bugs-that-happen-to-be-invisible.

---

## 1. Inventory — Files that form the page

| File | Role | Notes |
|---|---|---|
| `src/app/contact/page.js` | Client component, 257 LOC | All rendering + all data (bio, CV) live here |
| `src/app/contact/layout.js` | Route-level layout | Only sets metadata (`title`, `description`), then `return <>{children}</>` |
| `src/app/layout.js` | Root layout | Provides `<Sidebar />`, `<MobileMenu />`, `<CustomCursor />`, `<LanguageProvider>`, `<main>` wrapper |
| `src/contexts/LanguageContext.jsx` | i18n context | `useLanguage()` exposes `{ lang, setLang, t }`; reads from `dict` in `src/i18n/dict.js` |
| `src/i18n/dict.js` | Translation dictionary | Has `contact.contact`, `contact.about`, `contact.social`, `contact.cv`, `contact.altGif` only |
| `src/components/layout/Sidebar.js` | Parent nav | Renders the `/contact` entry at `Sidebar.js:175` using `t('sidebar.contact')` |
| `public/images/contact/gifcontacto.gif` | Right-column animation | **4.1 MB**, `width={800} height={1067}`, served with `priority` |

---

## 2. What the page does — functional map

```
┌─────────────────────────────────────────────────────────────┐
│ <div min-h-screen flex flex-col bg-white>                   │
│                                                             │
│   ┌─ flex-grow centered block ──────────────────────────┐   │
│   │                                                     │   │
│   │  ┌─ Left column (md:w-1/2) ────┐ ┌─ Right col ──┐   │   │
│   │  │  motion.div (slide-in -20x) │ │ motion.div   │   │   │
│   │  │                             │ │ (slide +20x) │   │   │
│   │  │  Section: Contact           │ │              │   │   │
│   │  │    h2 + email (plain text)  │ │  Next/Image  │   │   │
│   │  │                             │ │  gifcontacto │   │   │
│   │  │  Section: About             │ │  .gif (4MB)  │   │   │
│   │  │    h2 + aboutText (memo)    │ │  priority    │   │   │
│   │  │                             │ │              │   │   │
│   │  │  Section: Social            │ │              │   │   │
│   │  │    h2 + Instagram <a>       │ │              │   │   │
│   │  └─────────────────────────────┘ └──────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─ CV (collapsible, border-t border-white) ───────────┐   │
│   │  motion.button (toggle, "↓" rotates 180°)           │   │
│   │  AnimatePresence                                    │   │
│   │    motion.div (height: 0 ↔ auto, opacity 0 ↔ 1)     │   │
│   │      cvItems.map((item, index) => … period/title/   │   │
│   │                                  institution)       │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Runtime behavior
1. `'use client'` — client component (needed because of `useState`, `useMemo`, `framer-motion`, and `useLanguage`).
2. On mount, Framer Motion runs two independent entry animations: left column slides in from `x: -20`, right column slides from `x: +20` with a `0.2s` delay.
3. `aboutText` and `cvItems` are recomputed whenever `lang` changes via `useMemo`.
4. CV section is a controlled accordion driven by `isCvOpen` local state; `AnimatePresence` + `motion.div` animate `height: 0 ↔ auto` and `opacity: 0 ↔ 1`.
5. Language toggle at the sidebar flips `lang`, which triggers a re-render and `useMemo` recomputes the `es`/`en` strings.
6. The chevron inside the toggle rotates 180° on open.

### External / side-effect surface
- Emits one `mailto`-less email address (plain text `contacto.ceteo@gmail.com`).
- One outbound link: Instagram (`target="_blank" rel="noopener noreferrer"`).
- No network calls, no analytics, no form submission, no client-side routing beyond the sidebar.

---

## 3. Specificities — everything I noticed

### 3.1 Content & data

1. **Content-inside-component anti-pattern.** `aboutText` (bilingual) and `cvItems` (bilingual, 12 entries × 2 languages = 24 hand-maintained objects) live inline inside the React component via `useMemo`. All other i18n strings flow through `dict.js`. This is the only place in the codebase where bilingual static content is hardcoded in JSX.
2. **Duplication.** Each `cvItems` entry appears twice — once in `lang === 'es'`, once in the `en` fallback — with `period` and `institution` values that are frequently identical in both languages (e.g. `'2024'`, `'Pontificia Universidad Católica de Chile'`). This is ~80 lines of avoidable duplication and a future source of translation drift.
3. **Memoization with zero dependency churn.** `useMemo(..., [lang])` wraps two literal arrays. `lang` only changes on user toggle, and the arrays have no computation cost. Memoization is noise here.
4. **`'2021 - X'`** — literal `X` to signal "ongoing". Intentional, but undocumented.
5. **CV list render keys.** `key={index}` is stable because the list is static, but a semantic key (`${item.period}-${item.title}`) would be more robust.

### 3.2 i18n consistency

6. **Four `contact.*` keys in `dict.js`** (`contact`, `about`, `social`, `cv`, `altGif`) but the bio paragraph and every CV entry skip the dictionary entirely.
7. **Contract mismatch.** `LanguageContext.t()` returns the key itself if a translation is missing. Extending `dict.js` to hold `about`, `cvItems`, `email`, and `instagramUrl` would unify all translatable content under one schema.

### 3.3 Semantics & accessibility

8. **No landmarks.** The entire page is `<div>`s. No `<section>`, no `<header>`, no `<article>`, no `<aside>`. Screen readers get a flat tree.
9. **Accordion button has no ARIA.** `aria-expanded={isCvOpen}`, `aria-controls="contact-cv"`, and `id="contact-cv"` on the panel are all missing. Keyboard users get no state announcement.
10. **Button lacks `type="button"`.** Not currently inside a `<form>`, so it's fine today — but the default `type="submit"` is a footgun if the page ever gets wrapped in one.
11. **Heading order.** The page has three `<h2>`s (Contact, About, Social) plus one inside the CV toggle via `<span>` (not a heading at all). No `<h1>`. Either the CV toggle should be an `<h2>` wrapping a button, or the page needs a visually-hidden `<h1>` for document outline.
12. **Email is not a link.** `contacto.ceteo@gmail.com` is rendered as plain `<p>` text. On mobile, users cannot tap-to-compose. A `<a href="mailto:contacto.ceteo@gmail.com">` would fix this with zero visual change.
13. **Alt text is generic.** `t('contact.altGif')` → `"Animated graphic"` / `"Gráfico animado"`. Not descriptive. If the GIF is decorative, `alt=""` is more correct than a generic label (screen readers skip it). If it's meaningful, it should describe what it shows.
14. **Chevron is raw Unicode `↓`.** Not wrapped in an `aria-hidden="true"` span, so screen readers will announce "down arrow" every time they hit the toggle label.
15. **Focus ring.** The `hover:text-red-500` state exists but no `focus-visible:` equivalent. Keyboard-only users get no focus indication on either the accordion button or the Instagram link. Adding `focus-visible:text-red-500` would preserve the visual language exactly (same hover color) while fixing a11y.

### 3.4 Motion — over-imported / underused

16. **`<motion.div className="border-t border-white" initial={false}>`** (line 214–217) has no `animate`, no `variants`, no `whileInView`, no `transition`. It's a `<div>` wrapped for nothing. `initial={false}` is only meaningful when paired with an `animate` prop.
17. **`<motion.button>`** is a `<motion.button>` because its child `<motion.span>` animates `rotate`. The outer element doesn't animate at all — it could be a plain `<button>` containing a `<motion.span>`. Not wrong, just excess wrapping.
18. **Two independent `motion.div` entry animations** (left/right columns) could be expressed as one parent with `variants` + `staggerChildren`. Current approach is fine; centralizing just reduces duplication.
19. **Hardcoded timings.** `duration: 0.5`, `delay: 0.2`, `duration: 0.3` appear inline three times. If timings are a brand concern, a shared `motion/presets.js` would make them consistent across pages.

### 3.5 Invisible bug / dead style

20. **`border-t border-white` on the CV wrapper** (line 215). The page background is `bg-white`, so this top border is *visually invisible by construction*. Either (a) the intent was `border-black` / `border-black/10` and it's a silent bug, or (b) it's dead style that should be removed. Non-destructive fix: remove the class (no visual change). Verifying the intent with the designer would be safest.
21. **`<Image … className="w-auto h-auto" />`** (lines 205). Passing explicit `width={800} height={1067}` while overriding both dimensions with `w-auto h-auto` defeats Next.js's layout-shift protection. The reserved box is gone; the GIF pops in at its natural size. Non-destructive fix: drop `w-auto h-auto`, let Next/Image manage the box via the declared aspect ratio (800:1067), which is visually identical on load once the image is decoded but prevents CLS.

### 3.6 Performance

22. **4.1 MB GIF served with `priority`.** GIFs cannot be optimized by `next/image` (format-pass-through); the full 4 MB ships uncompressed. Swapping to `<video autoPlay loop muted playsInline poster>` with an MP4/WebM source typically drops the payload by 80–95% with identical visual result. This is a payload change, not a design-language change, but still worth flagging even though it falls outside the strict "no visual changes" rule.
23. **`priority` on a below-ish-the-fold asset.** On mobile (stacked), the GIF is below the left column, not in the LCP region. `priority` burns early-fetch budget.
24. **`'use client'` for the entire page** when only the CV accordion and motion effects need client state. The Contact/About/Social/GIF block could be a server component; only the CV accordion would need `'use client'`. Requires extracting two subcomponents. Non-visible improvement.

### 3.7 Component structure

25. **257 lines of a single client component with three distinct concerns** (hero info, hero media, CV accordion) plus all data. Decomposing into small named components makes the render tree readable and testable without changing one pixel on screen.
26. **Repetitive section markup** — `<div className="space-y-4"><h2 …>title</h2> … </div>` appears three times in the left column. A `<ContactSection title={…}>{…}</ContactSection>` local component removes the repetition.

---

## 4. Proposed structural / "diagrammatic" improvements

All proposals preserve the exact rendered markup/classnames where the class list is part of the design language. Where markup *tags* change (e.g. `<div>` → `<section>`), the visual result is identical because no default styling comes from the tag at this resolution (Tailwind reset takes care of it).

### 4.1 New component decomposition

```
src/app/contact/
├── page.js                 ← now ~35 lines: pure composition, exports server component
├── layout.js               ← unchanged
└── _components/
    ├── ContactInfo.jsx     ← left column (server component)
    ├── ContactMedia.jsx    ← right column GIF (server component)
    ├── ContactCV.jsx       ← accordion (client component, 'use client')
    └── ContactSection.jsx  ← <section> with <h2> + children (server component)

src/app/contact/_data/
├── about.js                ← { en, es } strings
└── cv.js                   ← language-agnostic data + i18n-key mapping

src/i18n/dict.js             ← extend with contact.aboutText, contact.cv.items.*
```

Rationale per file:
- **`page.js`** becomes a server component that just `import`s and composes. Motion entry animations move into a thin `<ContactReveal>` client wrapper or stay inline in `ContactInfo`/`ContactMedia` if those need to be client components for motion. (If the motion entry effect is non-negotiable, both can be client components; the CV accordion still benefits from extraction.)
- **`ContactSection`** removes the triple repetition of `<div className="space-y-4"><h2 …> …`. Takes a `title` prop and `children`. Zero visual diff.
- **`ContactCV`** owns `useState(isCvOpen)` and Framer Motion presence transition; it's the only component that strictly needs `'use client'`.
- **`_data/cv.js`** holds a single source of truth:
  ```js
  export const cvItems = [
    { period: '2021 - X', titleKey: 'cv.telematics', institutionKey: 'cv.usm' },
    …
  ];
  ```
  with translations in `dict.js`. Periods that don't need translating (years) live as literal values; only title+institution flow through `t()`.
- **Alt:** keep it as two flat arrays (`cvItemsEs`, `cvItemsEn`) — still better than inline, but the i18n-key route matches the existing `dict.js` pattern.

### 4.2 Semantic / a11y upgrades (all visually invisible)

| Before | After | Effect |
|---|---|---|
| `<div className="space-y-4">` around each info block | `<section className="space-y-4" aria-labelledby="…">` | Landmarks for AT |
| `<p>contacto.ceteo@gmail.com</p>` | `<a href="mailto:contacto.ceteo@gmail.com">contacto.ceteo@gmail.com</a>` with inherited classes | Tap-to-compose on mobile |
| `<motion.button … onClick={toggle}>` | Add `type="button" aria-expanded={isCvOpen} aria-controls="contact-cv"` | Accordion state exposed |
| `<motion.div … className="overflow-hidden">` | Add `id="contact-cv" role="region" aria-labelledby="contact-cv-toggle"` | Panel association |
| `↓` raw character | `<span aria-hidden="true">↓</span>` | Screen readers skip it |
| `hover:text-red-500` | `hover:text-red-500 focus-visible:text-red-500 focus:outline-none focus-visible:underline` | Keyboard focus visible without altering the look on mouse |
| `alt={t('contact.altGif')}` → "Animated graphic" | If decorative: `alt=""`; if content: describe (e.g. "CETEO self-portrait in motion") | Screen reader correctness |
| Missing `<h1>` | Add visually-hidden `<h1 className="sr-only">{t('sidebar.contact')}</h1>` | Document outline fix |

### 4.3 Motion cleanup

1. Delete the stray `<motion.div initial={false}>` wrapper around the CV section — replace with a plain `<div>`. `initial={false}` is only meaningful together with `animate={…}`, which is absent.
2. Change `<motion.button>` → `<button>` and keep only the inner `<motion.span>` for the chevron rotation. Same visual result, smaller tree.
3. Extract entry animation into a reusable `fadeSlideIn` variant (`src/components/motion/variants.js`) and reference it from both columns. Non-visible refactor.

### 4.4 Silent-bug fixes

- Remove `border-t border-white` on line 215 (border is invisible on white background). *Or* confirm with the designer that a separator was meant — but do not change the color without approval, because that *would* be a visual change.
- Remove `className="w-auto h-auto"` from the `Image` to restore layout-shift protection. The declared `800 × 1067` aspect ratio reserves the correct box. This is visually identical after decode but smoother on load.

### 4.5 Data ⇄ presentation split

Current render tree (inside component):
```
Contact (page)
├── aboutText = useMemo(() => …)    ← data ⚠ bilingual literal inline
├── cvItems   = useMemo(() => …)    ← data ⚠ bilingual literal inline
└── JSX (layout + sections + accordion)
```

Proposed:
```
Contact (page, server component)
└── composition only
    ├── <ContactInfo />
    ├── <ContactMedia />
    └── <ContactCV items={cvItems} />   ← data imported from _data/cv.js
                                          with translation via dict.js
```

No runtime behavior changes; the separation just makes the data auditable (a non-developer could update CV entries without touching JSX).

### 4.6 i18n schema extension (non-breaking)

```js
// src/i18n/dict.js (additions only, no key removals)
contact: {
  contact: 'Contact',
  about: 'About',
  social: 'Social',
  cv: 'CV',
  altGif: '',                               // decorative
  email: 'contacto.ceteo@gmail.com',
  aboutText: 'Mateo Cereceda (CETEO) is a new media artist…',
  cvItems: {                                // new subtree
    telematics:    { title: 'Telematics Civil Engineering',    institution: 'Universidad Técnica Federico Santa María' },
    bachelorArts:  { title: 'Bachelor of Arts',                institution: 'Pontificia Universidad Católica de Chile' },
    …
  },
}
```

Then in the component:
```js
const cvItems = CV_ITEM_IDS.map((id) => ({
  period: CV_PERIODS[id],
  title: t(`contact.cvItems.${id}.title`),
  institution: t(`contact.cvItems.${id}.institution`),
}));
```

Advantages: single source of truth, no duplication, future-proof for a third language, and consistent with how the rest of the codebase handles i18n.

---

## 5. Improvements sorted by *risk-to-visual* (lowest first)

| # | Change | Visual risk | Effort |
|---|---|---|---|
| 1 | Wrap email in `<a href="mailto:…">` | None (inherits classes) | Trivial |
| 2 | Add `aria-expanded`, `aria-controls`, `aria-hidden` | None | Trivial |
| 3 | Remove dead `initial={false}` `motion.div` wrapper | None | Trivial |
| 4 | Add `type="button"` to the toggle | None | Trivial |
| 5 | Wrap chevron in `aria-hidden` span | None | Trivial |
| 6 | Remove `w-auto h-auto` on `<Image>` | None after decode; fixes CLS | Trivial |
| 7 | Remove (or recolor, with approval) `border-t border-white` | None if removed; visible if recolored | Trivial |
| 8 | `<div>` → `<section>` for info blocks | None | Low |
| 9 | Extract `ContactSection`, `ContactCV` components | None | Low |
| 10 | Move `aboutText` / `cvItems` out of component | None | Low |
| 11 | Move content into `dict.js` under `contact.*` | None | Medium |
| 12 | Split page into server + `ContactCV` client island | None | Medium |
| 13 | Add `focus-visible:` rings | None on mouse; new state for keyboard | Trivial |
| 14 | Replace GIF with `<video>` | Should be pixel-equivalent but **is a media swap** — confirm with designer | Medium |

Items 1–10 can ship as a single PR titled "contact page: structural cleanup (no visual changes)" and be reviewed purely on a diff of behavior, not appearance.

---

## 6. What I deliberately did *not* propose

- **No new visual treatments** (dividers, hover underlines, new typography weights, new spacing rhythm).
- **No new design elements** (copy-to-clipboard button, contact form, QR code, social icons).
- **No color changes** — explicitly excluded by the constraint, including the suspicious `border-white` line.
- **No layout restructuring** — the two-column + accordion composition stays exactly as-is.
- **No removal of the Framer Motion entry animations** — they're part of the feel.
- **No tone/content rewrites** to `aboutText` or CV entries.
- **No sidebar label changes** (`CONTACT-ABOUT` / `CONTACTO-ACERCA`).

---

## 7. Open questions for the maintainer

1. `border-t border-white` on the CV wrapper — dead style, or was a visible separator intended? (If intended, what color?)
2. Is the contact GIF **decorative** (in which case `alt=""`) or **informational** (in which case it needs a real description)?
3. Is the GIF format a constraint (e.g. asset comes from an animation pipeline that outputs GIF), or can it be re-encoded to MP4/WebM?
4. Should the `'2021 - X'` "ongoing" marker be rendered as something language-aware (e.g. "Present" / "Presente") or kept as literal `X` as a stylistic choice?
5. Is the CV accordion meant to stay closed-by-default for ever, or is there a future intent to deep-link into `#cv`?

---

## 8. File-by-file change map (if the full refactor is approved)

```
src/app/contact/page.js                      ← shrink to composition, drop 'use client'
src/app/contact/layout.js                    ← unchanged
src/app/contact/_components/ContactInfo.jsx  ← NEW
src/app/contact/_components/ContactMedia.jsx ← NEW
src/app/contact/_components/ContactCV.jsx    ← NEW (only file with 'use client')
src/app/contact/_components/ContactSection.jsx ← NEW
src/app/contact/_data/cv.js                  ← NEW (language-agnostic data)
src/i18n/dict.js                             ← extend contact.* subtree
src/components/motion/variants.js            ← NEW (optional: shared motion presets)
```

Zero files deleted. Zero classNames changed (except the dead `border-white` line, pending question 1 in §7, and the `w-auto h-auto` removal in §4.4).

---

## 9. TL;DR

The `/contact` page is a small, mostly-static two-column layout plus a collapsible CV. It works, but it has:

- **Data hardcoded inside the component** (should live in `dict.js` or `_data/`).
- **Three redundant `motion.*` wrappers** (one has no animation at all).
- **Minor a11y gaps** (no landmarks, missing `aria-expanded`, non-clickable email, generic alt, no focus ring).
- **Two silent bugs** (`border-white` on white background; `w-auto h-auto` defeating Next/Image CLS protection).
- **A 4.1 MB GIF** marked `priority`, which is a perf concern independent of structure.

Fixing all of §4.1–§4.5 preserves the current visual + design language exactly and makes the page easier to maintain, audit, translate, and server-render.
