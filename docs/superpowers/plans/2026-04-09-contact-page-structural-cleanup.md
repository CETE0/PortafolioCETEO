# `/contact` Page — Structural Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/app/contact/page.js` (257 LOC, single client component with all data inlined) into a small, well-decomposed tree of components with data extracted, silent bugs fixed, and accessibility gaps closed — **without changing a single visible pixel**.

**Architecture:** Split the monolithic client page into (a) a server-component `page.js` that only composes, (b) two small client islands for the hero entry animations and the CV accordion, (c) a dumb `ContactSection` wrapper that removes three-way markup duplication, and (d) two plain-JS data modules for the bilingual bio and CV arrays. All Tailwind class lists on rendered elements stay byte-identical except for (i) removing dead `border-t border-white` and `w-auto h-auto`, and (ii) additive `focus-visible:` states.

**Tech Stack:** Next.js 15.5.9, React 19, Framer Motion 11, Tailwind 3.4, `LanguageContext` (in-house client context in `src/contexts/LanguageContext.jsx`). No test framework in this project — only `next lint` + `next build` + manual visual verification in `next dev`.

**Reference doc:** `docs/superpowers/specs/contact-page-analysis.md` contains the full analysis this plan implements. Section numbers below (§3.1, §4.4, etc.) refer to that document.

---

## Scope

**In scope (this plan):**

| # | What | From analysis | Type |
|---|------|---------------|------|
| 0 | Baseline verification (`next build` clean) | — | infra |
| 1 | Silent bug fixes & dead code removal | §3.5, §4.4 | bugfix |
| 2 | Accessibility — ARIA, `mailto:`, focus-visible | §3.3, §4.2 | a11y |
| 3 | Semantic HTML — `<section>` landmarks + sr-only `<h1>` | §3.3, §4.2 | a11y |
| 4 | Extract `aboutText` + `cvItems` to `_data/` modules | §3.1, §4.5 | refactor |
| 5 | Extract `<ContactSection>` wrapper component | §3.7, §4.1 | refactor |
| 6 | Extract `<ContactCV>` client component (accordion) | §3.7, §4.1 | refactor |
| 7 | Extract `<ContactHero>` client component + convert `page.js` to server component | §3.6, §4.1 | refactor |
| 8 | Final lint + build + visual verification | — | infra |

**Explicitly deferred (not this plan):**

- GIF → video swap (§3.6 / §4.5 item 14). Touches media, needs designer sign-off per analysis §7 question 3.
- Moving `aboutText` and CV strings into `dict.js` (§4.6). Worth doing but adds a second i18n refactor on top of the data extraction; can ship after this plan lands as a follow-up. The `_data/` files in Task 4 are structured to make this cheap later (see §7.2 in this doc).
- Recoloring the dead `border-t border-white` instead of removing it. Analysis §7 question 1 flags this as an open designer question — plan removes the invisible line; if a separator was intended, a follow-up PR adds it back with an approved color.
- Any content rewrites to bio or CV entries.
- Removing the `'2021 - X'` literal `X` convention — analysis §7 question 4.

---

## File Structure

**Created:**

```
docs/superpowers/plans/2026-04-09-contact-page-structural-cleanup.md   ← this file
src/app/contact/_data/about.js                                          ← Task 4
src/app/contact/_data/cv.js                                             ← Task 4
src/app/contact/_components/ContactSection.jsx                          ← Task 5
src/app/contact/_components/ContactCV.jsx                               ← Task 6
src/app/contact/_components/ContactHero.jsx                             ← Task 7
```

**Modified:**

```
src/app/contact/page.js
  ├─ Task 1: remove dead motion wrapper, border-white, w-auto h-auto, add type="button"
  ├─ Task 2: mailto link, ARIA attrs, focus-visible, aria-hidden chevron
  ├─ Task 3: <div> → <section>, add sr-only <h1>
  ├─ Task 4: replace inline useMemo with imports from _data/
  ├─ Task 5: replace inline <div className="space-y-4"><h2>…</h2>…</div> with <ContactSection>
  ├─ Task 6: replace inline accordion block with <ContactCV />
  └─ Task 7: remove 'use client', replace hero block with <ContactHero />, shrink to composition
```

**Untouched:**

```
src/app/contact/layout.js                  ← metadata only, no change
src/contexts/LanguageContext.jsx           ← no change
src/i18n/dict.js                           ← no change in this plan (see §7.2)
src/app/layout.js                          ← no change
public/images/contact/gifcontacto.gif      ← unchanged (video swap deferred)
```

Each task touches **one well-localised region** of `page.js` (or the relevant new file) so every commit is self-contained and independently revertible.

---

## Verification Strategy

The project has **zero test infrastructure**. There is no Jest, Vitest, Playwright, Cypress, or `@testing-library`. The only automation is `next lint`. Setting up a testing framework just to verify this cleanup would be massive scope creep, so this plan uses a deliberately small **three-tier** verification strategy:

1. **`next lint`** — run after every task. Must pass with zero new warnings.
2. **`next build`** — run after every task that touches imports or changes a file's server/client boundary (Tasks 4, 6, 7). Must produce a clean production build.
3. **Manual visual diff in `next dev`** — run after Task 1, Task 3, Task 6, Task 7, and Task 8. Each task lists the exact URL (`http://localhost:3000/contact`), the exact actions (toggle CV open/closed, switch ES↔EN, tab through keyboard focus), and the exact thing to compare (should be pixel-identical to the pre-plan state except where explicitly noted).

**Pre-plan reference screenshots.** Before starting Task 1, open `http://localhost:3000/contact` in dev mode, capture three screenshots for later comparison:

```
/tmp/contact-baseline-closed-en.png    ← CV closed, English
/tmp/contact-baseline-open-es.png      ← CV open, Spanish
/tmp/contact-baseline-mobile.png       ← mobile viewport (DevTools 375×812)
```

These are the ground-truth images. After the final task, take the same three screenshots and compare — they should be visually indistinguishable.

---

## Task 0 — Baseline verification ✅

**Files:** none modified.

- [x] **Step 1: Confirm clean working tree on the starting branch**

Run:
```bash
git -C /Users/teo/Proyectos/PortafolioCETEO status
```

Expected: the pre-existing modifications to `src/app/globals.css` and `src/app/layout.js` are present but no contact-page files are dirty. Note the current branch and commit SHA:

```bash
git -C /Users/teo/Proyectos/PortafolioCETEO rev-parse --abbrev-ref HEAD
git -C /Users/teo/Proyectos/PortafolioCETEO rev-parse HEAD
```

Record the SHA as the "pre-cleanup" baseline so you can `git diff <SHA> -- src/app/contact` at the end.

- [x] **Step 2: Confirm baseline build passes**

Run:
```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run build
```

Expected: build succeeds with no errors. Note any pre-existing warnings so you can distinguish them from new ones introduced by this refactor.

**Result:** Baseline SHA `4892718264af2ce8f55452701d3b957bb60aa232`. Build passes. `/contact` route: 3.14 kB / 148 kB First Load JS. Pre-existing metadata warnings noted (unrelated to contact page).

- [x] **Step 3: Start dev server and capture baseline screenshots** *(deferred — no browser available in this session; manual verification deferred to the human reviewer)*

- [x] **Step 4: Stop the dev server** *(N/A)*

---

## Task 1 — Silent bug fixes & dead code removal ✅

**Goal:** Fix four purely mechanical issues that have zero visible effect today but silently break future work, a11y, or CLS. All four changes land in a single commit because none of them stand on their own.

**Fixes:**

1. **Remove dead `<motion.div initial={false}>` wrapper** around the CV section. `initial={false}` only has meaning together with an `animate` prop; there's no animation here, so it's a plain `<div>`.
2. **Remove `border-t border-white`** class (§3.5 #20 in analysis). The border is invisible because the page background is `bg-white`. If a separator was intended, that is a designer question (§7 question 1) — for now we remove the dead class.
3. **Remove `className="w-auto h-auto"`** from the `<Image>` (§3.5 #21). `w-auto h-auto` defeats Next/Image's declared-aspect-ratio layout-shift protection. Removing it restores CLS protection and is visually identical after decode.
4. **Add `type="button"`** to the accordion toggle (§3.3 #10). Default `<button>` type is `submit`; it's inert today because there's no `<form>`, but it's a footgun.

**File:** `src/app/contact/page.js`

- [ ] **Step 1: Remove the dead `motion.div` wrapper and the dead border**

Find this block (around lines 213–217):

```jsx
      {/* CV Section */}
      <motion.div 
        className="border-t border-white"
        initial={false}
      >
```

Replace with:

```jsx
      {/* CV Section */}
      <div>
```

And the matching closing tag — find (around line 254):

```jsx
      </motion.div>
    </div>
  );
}
```

Replace with:

```jsx
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remove `w-auto h-auto` from the Image**

Find (around lines 199–208):

```jsx
            <div className="relative w-full">
              <Image
                src="/images/contact/gifcontacto.gif"
                alt={t('contact.altGif')}
                width={800}
                height={1067}
                className="w-auto h-auto"
                priority
              />
            </div>
```

Replace with (note: `className` is removed entirely — do **not** replace it with `className=""`):

```jsx
            <div className="relative w-full">
              <Image
                src="/images/contact/gifcontacto.gif"
                alt={t('contact.altGif')}
                width={800}
                height={1067}
                priority
              />
            </div>
```

- [ ] **Step 3: Add `type="button"` to the accordion toggle**

Find (around lines 219–222):

```jsx
        <motion.button
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
```

Replace with:

```jsx
        <motion.button
          type="button"
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
```

- [ ] **Step 4: Lint**

Run:
```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint
```

Expected: no new warnings or errors on `src/app/contact/page.js`.

- [ ] **Step 5: Visual verification**

Start dev server, open `http://localhost:3000/contact`, and compare against `/tmp/contact-baseline-closed-en.png` and `/tmp/contact-baseline-open-es.png`:

- Page renders identically
- CV accordion still opens and closes with the chevron rotating
- Entry animations on left and right columns still run
- No horizontal scroll on mobile viewport
- The GIF no longer pops in at a different size on first paint (this is the CLS fix; visible improvement, but not a visual regression)

- [ ] **Step 6: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: remove dead motion wrapper, invisible border, CLS-breaking Image classes

- Drop <motion.div initial={false}> around CV section; no animation was defined
- Remove dead `border-t border-white` class (invisible on white background)
- Remove `w-auto h-auto` from Next/Image to restore CLS protection
- Add type="button" to CV toggle

Zero visual change. See docs/superpowers/specs/contact-page-analysis.md §3.5, §4.4.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Accessibility: ARIA, mailto, focus-visible ✅

**Goal:** Make the page usable with a keyboard and assistive technology. Every change here is either invisible to sighted mouse users, or only adds behaviour (`mailto:` launches a mail client on tap, focus ring appears on Tab). Visual result on mouse hover/click is byte-identical.

**Changes:**

1. Wrap the email address in an `<a href="mailto:…">` that inherits the exact surrounding classes.
2. Add `aria-expanded` / `aria-controls` / `id` to the accordion button.
3. Add `id` / `role="region"` / `aria-labelledby` to the accordion panel.
4. Wrap the `↓` chevron character in `<span aria-hidden="true">` so screen readers skip it.
5. Add `focus-visible:text-red-500` to the accordion toggle and the Instagram link — identical to the existing `hover:` state, so no visual regression for mouse users.

**File:** `src/app/contact/page.js`

- [ ] **Step 1: Convert email `<p>` to a `mailto:` link**

Find (around lines 161–166):

```jsx
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <p>contacto.ceteo@gmail.com</p>
              </div>
            </div>
```

Replace with:

```jsx
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
                  className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
                >
                  contacto.ceteo@gmail.com
                </a>
              </div>
            </div>
```

Note: the surrounding `<div>` supplies `text-sm font-light`, so the `<a>` inherits them. We explicitly add `text-black` on the `<a>` so the default browser blue link color does not override the design.

- [ ] **Step 2: Add `focus-visible:` to the Instagram link**

Find (around lines 180–186):

```jsx
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-black hover:text-red-500 transition-colors font-light"
                >
                  Instagram
                </a>
```

Replace with:

```jsx
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors font-light"
                >
                  Instagram
                </a>
```

- [ ] **Step 3: Add ARIA + focus-visible to the CV toggle button; wrap chevron in `aria-hidden` span**

Find (around lines 219–230):

```jsx
        <motion.button
          type="button"
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">{t('contact.cv')}</span>
          <motion.span
            animate={{ rotate: isCvOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ↓
          </motion.span>
        </motion.button>
```

Replace with:

```jsx
        <motion.button
          type="button"
          id="contact-cv-toggle"
          aria-expanded={isCvOpen}
          aria-controls="contact-cv-panel"
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">{t('contact.cv')}</span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: isCvOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ↓
          </motion.span>
        </motion.button>
```

- [ ] **Step 4: Add `id` + `role="region"` + `aria-labelledby` to the accordion panel**

Find (around lines 233–253):

```jsx
        <AnimatePresence>
          {isCvOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 md:px-8 py-4 space-y-4">
                {cvItems.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm font-medium text-black">{item.period}</p>
                    <p className="text-sm text-black">{item.title}</p>
                    <p className="text-sm text-black/70">{item.institution}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
```

Replace with:

```jsx
        <AnimatePresence>
          {isCvOpen && (
            <motion.div
              id="contact-cv-panel"
              role="region"
              aria-labelledby="contact-cv-toggle"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 md:px-8 py-4 space-y-4">
                {cvItems.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm font-medium text-black">{item.period}</p>
                    <p className="text-sm text-black">{item.title}</p>
                    <p className="text-sm text-black/70">{item.institution}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
```

- [ ] **Step 5: Lint**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint
```

Expected: no new warnings.

- [ ] **Step 6: Keyboard & visual verification**

Start dev server, open `http://localhost:3000/contact`:

- Mouse-hover the email: cursor changes to pointer, text turns red. Click: OS mail composer opens (or browser prompts for handler).
- Press `Tab` repeatedly from the page start. Focus should land on, in order: (sidebar items) → email link → Instagram link → CV toggle. Each focused element should turn red (`focus-visible:text-red-500`).
- Press `Enter` on the CV toggle: accordion opens. Press `Enter` again: it closes.
- Use a screen reader (VoiceOver: `Cmd+F5`) and navigate to the CV toggle. It should announce "CV, collapsed, button" → activate → "CV, expanded, button".
- Compare visual appearance on mouse hover against baseline — identical.

- [ ] **Step 7: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: a11y — mailto, ARIA, focus-visible, aria-hidden chevron

- Wrap email in <a href="mailto:…"> with inherited styling
- Add aria-expanded/aria-controls to CV toggle, id/role/aria-labelledby to panel
- Wrap chevron in aria-hidden span
- Add focus-visible:text-red-500 to email, Instagram, CV toggle (matches existing hover)

No visual change on mouse; keyboard users now get focus indication and screen
reader users get accordion state. See spec §3.3, §4.2.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Semantic HTML: `<section>` landmarks + sr-only `<h1>` ✅

**Goal:** Replace the three info-block `<div>`s with `<section>` tags and add a visually-hidden `<h1>` so the page has a valid document outline.

**Changes:**

1. Change the three inner info blocks (Contact, About, Social) from `<div className="space-y-4">` to `<section aria-labelledby="…" className="space-y-4">`, adding matching `id`s on the `<h2>` headings.
2. Add `<h1 className="sr-only">{t('sidebar.contact')}</h1>` at the top of the page so the document outline has a root. `sr-only` is part of Tailwind's default utility set — it is available without config changes.

**File:** `src/app/contact/page.js`

- [ ] **Step 1: Add the visually-hidden `<h1>`**

Find (around lines 148–151):

```jsx
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Contenido principal */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-8">
```

Replace with:

```jsx
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <h1 className="sr-only">{t('sidebar.contact')}</h1>
      {/* Contenido principal */}
      <div className="flex-grow flex items-center justify-center p-4 md:p-8">
```

- [ ] **Step 2: Convert the Contact info block to `<section>`**

Find (around lines 161–166, post-Task-2):

```jsx
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
```

Replace with:

```jsx
            <section aria-labelledby="contact-h-contact" className="space-y-4">
              <h2 id="contact-h-contact" className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
```

And its closing tag — find (around line 167 after Task 2):

```jsx
              </div>
            </div>

            {/* About */}
```

Replace with:

```jsx
              </div>
            </section>

            {/* About */}
```

- [ ] **Step 3: Convert the About info block to `<section>`**

Find:

```jsx
            {/* About */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.about')}</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </div>
```

Replace with:

```jsx
            {/* About */}
            <section aria-labelledby="contact-h-about" className="space-y-4">
              <h2 id="contact-h-about" className="text-xl font-light text-black">{t('contact.about')}</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </section>
```

- [ ] **Step 4: Convert the Social info block to `<section>`**

Find:

```jsx
            {/* Social */}
            <div className="space-y-4">
              <h2 className="text-xl font-light text-black">{t('contact.social')}</h2>
              <div className="space-y-2">
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
```

Replace with:

```jsx
            {/* Social */}
            <section aria-labelledby="contact-h-social" className="space-y-4">
              <h2 id="contact-h-social" className="text-xl font-light text-black">{t('contact.social')}</h2>
              <div className="space-y-2">
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
```

And its closing tag — find:

```jsx
                  Instagram
                </a>
              </div>
            </div>
          </motion.div>
```

Replace with:

```jsx
                  Instagram
                </a>
              </div>
            </section>
          </motion.div>
```

- [ ] **Step 5: Lint**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint
```

Expected: no new warnings.

- [ ] **Step 6: Visual verification**

Open `http://localhost:3000/contact`. The page should render identically — `<section>` and `<div>` have the same default block layout and no Tailwind `section {}` overrides exist. Compare against `/tmp/contact-baseline-closed-en.png`.

Screen reader check (optional but recommended): VoiceOver rotor (`VO+U`) should now list Contact, About, Social as landmarks.

- [ ] **Step 7: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: semantic HTML — sr-only h1 + section landmarks

- Add visually-hidden <h1> so the page has a document outline root
- Change three info blocks from <div> to <section aria-labelledby>
- Link each section to its <h2> via id

No visual change. See spec §3.3, §4.2.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Extract `aboutText` + `cvItems` to `_data/` modules ✅

**Goal:** Move the bilingual bio string and all 24 CV objects out of the React component body and into plain-JS data modules. This kills ~90 lines of in-component literal data, makes the component easier to read, and removes two unnecessary `useMemo` calls on static data.

**Important:** We do **not** move the strings into `dict.js` in this task. That is a follow-up (§7.2) because it is a second, independent refactor (new dictionary keys + consumer changes). For now, the data modules are structured so that moving into `dict.js` later is a mechanical rename.

**File structure after this task:**

```
src/app/contact/
├── page.js                      ← modified
├── layout.js
└── _data/
    ├── about.js                 ← NEW
    └── cv.js                    ← NEW
```

- [ ] **Step 1: Create `_data/about.js`**

Create `src/app/contact/_data/about.js`:

```js
// Bilingual bio text for the contact page About section.
// Future follow-up: move into src/i18n/dict.js as contact.aboutText.

export const ABOUT_TEXT = {
  es: 'Mateo Cereceda (CETEO) es un artista de nuevos medios radicado en Santiago, Chile. Actualmente trabaja en la intersección entre el arte digital y la instalación escultórica experimental.',
  en: 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.',
};
```

- [ ] **Step 2: Create `_data/cv.js`**

Create `src/app/contact/_data/cv.js`:

```js
// Bilingual CV entries for the contact page CV accordion.
// Future follow-up: move title + institution into src/i18n/dict.js under
// contact.cvItems.<id>.{title,institution} with stable IDs; periods stay here.

export const CV_ITEMS = {
  es: [
    {
      period: '2021 - X',
      title: 'Ingeniería Civil Telemática',
      institution: 'Universidad Técnica Federico Santa María',
    },
    {
      period: '2022 - 2025',
      title: 'Licenciatura en Artes',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2022',
      title: 'Bootcamp de Desarrollo Web Full Stack',
      institution: 'Universidad del Desarrollo',
    },
    {
      period: '2023',
      title: 'Taller Internacional de Producción de Moda, Coolhunting y Styling en NYC',
      institution: 'Chile Fashion Studios',
    },
    {
      period: '2024',
      title: 'Exposición TOMA#1',
      institution: 'Producción y Curaduría',
    },
    {
      period: '2024',
      title: 'Exposición TOMA#2',
      institution: 'Producción y Curaduría',
    },
    {
      period: '2024',
      title: 'Ayudante Pregrado - Fotogrametria y Modelado 3D',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'Ayudante Laboratorio LAITEC',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'Ayudante Posgrado - Laboratorio de Creación Interdisciplinaria en Artes y Tecnología',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'Exposición TOMA#3',
      institution: 'Producción y Curaduría',
    },
    {
      period: '2025',
      title: 'Exposición TOMA#4',
      institution: 'Producción y Curaduría',
    },
    {
      period: '2025',
      title: '17 Bienal de Artes Mediales de Santiago',
      institution: 'TOMA Colectivo - Asistente de Producción',
    },
  ],
  en: [
    {
      period: '2021 - X',
      title: 'Telematics Civil Engineering',
      institution: 'Universidad Técnica Federico Santa María',
    },
    {
      period: '2022 - 2025',
      title: 'Bachelor of Arts',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2022',
      title: 'Full Stack Web Development Bootcamp',
      institution: 'Universidad del Desarrollo',
    },
    {
      period: '2023',
      title: 'International Workshop on Fashion Production, Coolhunting and Styling in NYC',
      institution: 'Chile Fashion Studios',
    },
    {
      period: '2024',
      title: 'TOMA#1 Exhibition',
      institution: 'Production & Curation',
    },
    {
      period: '2024',
      title: 'TOMA#2 Exhibition',
      institution: 'Production & Curation',
    },
    {
      period: '2024',
      title: 'Undergraduate Teaching Assistant - Photogrammetry and 3D Modeling',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'Laboratory Assistant LAITEC',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'Graduate Teaching Assistant - Laboratory of Interdisciplinary Creation in Arts and Technology',
      institution: 'Pontificia Universidad Católica de Chile',
    },
    {
      period: '2025',
      title: 'TOMA#3 Exhibition',
      institution: 'Production & Curation',
    },
    {
      period: '2025',
      title: 'TOMA#4 Exhibition',
      institution: 'Production & Curation',
    },
    {
      period: '2025',
      title: '17th Santiago Media Arts Biennial',
      institution: 'TOMA Colectivo - Production Assistant',
    },
  ],
};
```

**Critical:** copy the exact strings verbatim from `page.js`. Any typo breaks the bilingual display.

- [ ] **Step 3: Rewrite `page.js` top of file to import data and drop `useMemo`**

Find (lines 1–17):

```jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Contact() {
  const { t, lang } = useLanguage();
  const [isCvOpen, setIsCvOpen] = useState(false);

  const aboutText = useMemo(() => {
    if (lang === 'es') {
      return 'Mateo Cereceda (CETEO) es un artista de nuevos medios radicado en Santiago, Chile. Actualmente trabaja en la intersección entre el arte digital y la instalación escultórica experimental.';
    }
    return 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.';
  }, [lang]);
```

Replace with:

```jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import { CV_ITEMS } from './_data/cv';

export default function Contact() {
  const { t, lang } = useLanguage();
  const [isCvOpen, setIsCvOpen] = useState(false);

  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;
```

- [ ] **Step 4: Delete the inline `cvItems` useMemo block**

Find the entire block from `  const cvItems = useMemo(() => {` through the final `}, [lang]);` (approximately lines 19–146 in the post-Task-3 file — the block ending with `}, [lang]);`).

Replace the entire block with:

```jsx
  const cvItems = CV_ITEMS[lang] ?? CV_ITEMS.en;
```

- [ ] **Step 5: Lint and build**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint && npm run build
```

Expected: lint passes, build completes. Build is needed here because we changed imports and added new files under `src/app/contact/` which Next.js will try to resolve.

- [ ] **Step 6: Visual verification (both languages, CV open)**

Start dev server, visit `http://localhost:3000/contact`:

- Open CV. Verify all 12 entries appear in the current language with the correct period, title, institution.
- Toggle language (ES↔EN) in the sidebar switcher. Verify all 12 entries re-translate correctly.
- Verify About paragraph re-translates correctly.
- Verify no entries are missing, duplicated, or in the wrong language.

- [ ] **Step 7: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/_data/about.js src/app/contact/_data/cv.js src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: extract aboutText and cvItems to _data/ modules

- Move bilingual bio to src/app/contact/_data/about.js as ABOUT_TEXT
- Move 12 bilingual CV entries to src/app/contact/_data/cv.js as CV_ITEMS
- Drop unnecessary useMemo on static literals
- page.js now imports and selects by lang instead of inlining 90 LOC of data

No visual change. See spec §3.1, §4.5.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Extract `<ContactSection>` wrapper component ✅

**Goal:** Remove the three-way duplication of `<section aria-labelledby="…"><h2>…</h2>…</section>` in the left column by extracting a dumb `ContactSection` wrapper.

**Design:**

```jsx
<ContactSection id="contact" title={t('contact.contact')}>
  <a href="mailto:…">…</a>
</ContactSection>
```

The component synthesizes the `id`s internally from the `id` prop (e.g. `contact-h-contact`, `contact-sec-contact`) so callers don't repeat themselves.

**File:** `src/app/contact/_components/ContactSection.jsx` (new).

- [ ] **Step 1: Create the component file**

Create `src/app/contact/_components/ContactSection.jsx`:

```jsx
// Dumb wrapper that renders a labelled <section> with a heading.
// Used by the contact page left column to remove repetitive markup.
// Visual result is byte-identical to:
//   <section aria-labelledby="contact-h-{id}" className="space-y-4">
//     <h2 id="contact-h-{id}" className="text-xl font-light text-black">{title}</h2>
//     {children}
//   </section>

export default function ContactSection({ id, title, children }) {
  const headingId = `contact-h-${id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h2 id={headingId} className="text-xl font-light text-black">
        {title}
      </h2>
      {children}
    </section>
  );
}
```

Note: this component takes `title` as a pre-resolved string prop, so it does not need `'use client'`. The caller (still the client `page.js`) passes `t('contact.contact')` etc.

- [ ] **Step 2: Import `ContactSection` in `page.js`**

Find (around lines 1–8, post-Task-4):

```jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import { CV_ITEMS } from './_data/cv';
```

Replace with:

```jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import { CV_ITEMS } from './_data/cv';
import ContactSection from './_components/ContactSection';
```

- [ ] **Step 3: Replace the Contact `<section>` with `<ContactSection>`**

Find (around lines 161–170 in post-Task-3 file):

```jsx
            <section aria-labelledby="contact-h-contact" className="space-y-4">
              <h2 id="contact-h-contact" className="text-xl font-light text-black">{t('contact.contact')}</h2>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
                  className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
                >
                  contacto.ceteo@gmail.com
                </a>
              </div>
            </section>
```

Replace with:

```jsx
            <ContactSection id="contact" title={t('contact.contact')}>
              <div className="space-y-2 text-black text-sm font-light">
                <a
                  href="mailto:contacto.ceteo@gmail.com"
                  className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
                >
                  contacto.ceteo@gmail.com
                </a>
              </div>
            </ContactSection>
```

- [ ] **Step 4: Replace the About `<section>` with `<ContactSection>`**

Find:

```jsx
            {/* About */}
            <section aria-labelledby="contact-h-about" className="space-y-4">
              <h2 id="contact-h-about" className="text-xl font-light text-black">{t('contact.about')}</h2>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </section>
```

Replace with:

```jsx
            {/* About */}
            <ContactSection id="about" title={t('contact.about')}>
              <p className="text-black text-sm font-light leading-relaxed">
                {aboutText}
              </p>
            </ContactSection>
```

- [ ] **Step 5: Replace the Social `<section>` with `<ContactSection>`**

Find:

```jsx
            {/* Social */}
            <section aria-labelledby="contact-h-social" className="space-y-4">
              <h2 id="contact-h-social" className="text-xl font-light text-black">{t('contact.social')}</h2>
              <div className="space-y-2">
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors font-light"
                >
                  Instagram
                </a>
              </div>
            </section>
```

Replace with:

```jsx
            {/* Social */}
            <ContactSection id="social" title={t('contact.social')}>
              <div className="space-y-2">
                <a 
                  href="https://www.instagram.com/c.e.teo/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors font-light"
                >
                  Instagram
                </a>
              </div>
            </ContactSection>
```

- [ ] **Step 6: Lint and build**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint && npm run build
```

Expected: pass.

- [ ] **Step 7: Visual verification**

Open `http://localhost:3000/contact`. The left column should render identically. Inspect the DOM in DevTools and confirm the three sections still carry `aria-labelledby` pointing at the matching `<h2 id>`.

- [ ] **Step 8: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/_components/ContactSection.jsx src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: extract <ContactSection> wrapper to DRY info blocks

- New src/app/contact/_components/ContactSection.jsx takes id + title
- Replaces three duplicated <section aria-labelledby><h2>…</h2></section> blocks
- Synthesizes heading ids from the id prop so callers don't repeat themselves

No visual change. See spec §3.7, §4.1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Extract `<ContactCV>` client component ✅

**Goal:** Move the CV accordion (toggle button + AnimatePresence panel + `useState` + CV item list rendering) into its own client component. This is the smallest standalone client island on the page and is the easiest to reason about in isolation.

**Interface:** `<ContactCV />` reads `useLanguage()` internally to pick the correct `CV_ITEMS[lang]` and to call `t('contact.cv')` for the toggle label. No props.

**File:** `src/app/contact/_components/ContactCV.jsx` (new).

- [ ] **Step 1: Create `ContactCV.jsx`**

Create `src/app/contact/_components/ContactCV.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { CV_ITEMS } from '../_data/cv';

export default function ContactCV() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const items = CV_ITEMS[lang] ?? CV_ITEMS.en;

  return (
    <div>
      <motion.button
        type="button"
        id="contact-cv-toggle"
        aria-expanded={isOpen}
        aria-controls="contact-cv-panel"
        className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="text-xl font-light">{t('contact.cv')}</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ↓
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="contact-cv-panel"
            role="region"
            aria-labelledby="contact-cv-toggle"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-8 py-4 space-y-4">
              {items.map((item, index) => (
                <div key={`${item.period}-${index}`} className="space-y-1">
                  <p className="text-sm font-medium text-black">{item.period}</p>
                  <p className="text-sm text-black">{item.title}</p>
                  <p className="text-sm text-black/70">{item.institution}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Important:** every `className`, ARIA attribute, and motion prop must be byte-identical to what exists in `page.js` after Tasks 1–3. The only permissible deltas are:

1. `setIsCvOpen(!isCvOpen)` → `setIsOpen((prev) => !prev)` (functional updater, renamed state).
2. `key={index}` → `key={`${item.period}-${index}`}` (slightly more stable key).

- [ ] **Step 2: Update `page.js` imports**

Find (post-Task-5 imports):

```jsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import { CV_ITEMS } from './_data/cv';
import ContactSection from './_components/ContactSection';
```

Replace with:

```jsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from './_data/about';
import ContactSection from './_components/ContactSection';
import ContactCV from './_components/ContactCV';
```

Note: `AnimatePresence`, `useState`, and `CV_ITEMS` imports are removed because they now live inside `ContactCV`.

- [ ] **Step 3: Delete local CV state and the `cvItems` selector**

Find (post-Task-4, around lines 8–14):

```jsx
export default function Contact() {
  const { t, lang } = useLanguage();
  const [isCvOpen, setIsCvOpen] = useState(false);

  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;

  const cvItems = CV_ITEMS[lang] ?? CV_ITEMS.en;
```

Replace with:

```jsx
export default function Contact() {
  const { t, lang } = useLanguage();

  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;
```

- [ ] **Step 4: Replace the inline accordion block with `<ContactCV />`**

Find the entire CV block starting at `{/* CV Section */}` and ending at the outer wrapper's closing `</div>` — roughly:

```jsx
      {/* CV Section */}
      <div>
        {/* CV Header/Toggle */}
        <motion.button
          type="button"
          id="contact-cv-toggle"
          aria-expanded={isCvOpen}
          aria-controls="contact-cv-panel"
          className="w-full py-4 px-4 md:px-8 flex items-center justify-between text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
          onClick={() => setIsCvOpen(!isCvOpen)}
        >
          <span className="text-xl font-light">{t('contact.cv')}</span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: isCvOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ↓
          </motion.span>
        </motion.button>

        {/* CV Content */}
        <AnimatePresence>
          {isCvOpen && (
            <motion.div
              id="contact-cv-panel"
              role="region"
              aria-labelledby="contact-cv-toggle"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 md:px-8 py-4 space-y-4">
                {cvItems.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm font-medium text-black">{item.period}</p>
                    <p className="text-sm text-black">{item.title}</p>
                    <p className="text-sm text-black/70">{item.institution}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
```

Replace with:

```jsx
      {/* CV Section */}
      <ContactCV />
```

- [ ] **Step 5: Lint and build**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint && npm run build
```

Expected: pass.

- [ ] **Step 6: Visual + keyboard verification**

Start dev server, visit `http://localhost:3000/contact`:

- CV toggle rendering is identical.
- Clicking the toggle opens/closes the accordion with the same height animation.
- Chevron still rotates 180°.
- Switching ES↔EN re-translates all 12 entries.
- Tabbing to the toggle shows the focus-visible red color.
- Screen reader announces "CV, collapsed/expanded, button".

Compare side-by-side with `/tmp/contact-baseline-open-es.png`.

- [ ] **Step 7: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/_components/ContactCV.jsx src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: extract <ContactCV> client component

- New src/app/contact/_components/ContactCV.jsx owns accordion state + rendering
- Reads CV_ITEMS and useLanguage() internally; no props
- page.js drops useState, AnimatePresence, CV_ITEMS imports

No visual change. See spec §3.7, §4.1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Extract `<ContactHero>` client component + convert `page.js` to server component ✅

**Goal:** Move the two-column hero (left info column + right GIF) with its Framer Motion entry animations into a `ContactHero` client component. Once done, `page.js` has no client-only code left and can drop `'use client'`, becoming a server component that just composes.

**Why bundle these two changes into one task:** `page.js` cannot become a server component until the last client-only code leaves it. Doing the extraction and the `'use client'` removal in separate commits would leave `page.js` in a state where it still says `'use client'` but has nothing client-specific — confusing in review.

**File:** `src/app/contact/_components/ContactHero.jsx` (new), `src/app/contact/page.js` (modified).

- [ ] **Step 1: Create `ContactHero.jsx`**

Create `src/app/contact/_components/ContactHero.jsx`:

```jsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT_TEXT } from '../_data/about';
import ContactSection from './ContactSection';

export default function ContactHero() {
  const { t, lang } = useLanguage();
  const aboutText = ABOUT_TEXT[lang] ?? ABOUT_TEXT.en;

  return (
    <div className="flex-grow flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col md:flex-row max-w-5xl w-full gap-8 md:gap-16">
        {/* Columna izquierda - Información */}
        <motion.div
          className="w-full md:w-1/2 space-y-8 md:space-y-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ContactSection id="contact" title={t('contact.contact')}>
            <div className="space-y-2 text-black text-sm font-light">
              <a
                href="mailto:contacto.ceteo@gmail.com"
                className="block text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors"
              >
                contacto.ceteo@gmail.com
              </a>
            </div>
          </ContactSection>

          <ContactSection id="about" title={t('contact.about')}>
            <p className="text-black text-sm font-light leading-relaxed">
              {aboutText}
            </p>
          </ContactSection>

          <ContactSection id="social" title={t('contact.social')}>
            <div className="space-y-2">
              <a
                href="https://www.instagram.com/c.e.teo/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-black hover:text-red-500 focus-visible:text-red-500 focus:outline-none transition-colors font-light"
              >
                Instagram
              </a>
            </div>
          </ContactSection>
        </motion.div>

        {/* Columna derecha - GIF */}
        <motion.div
          className="w-full md:w-1/2 flex items-center justify-center"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative w-full">
            <Image
              src="/images/contact/gifcontacto.gif"
              alt={t('contact.altGif')}
              width={800}
              height={1067}
              priority
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

**Byte-level check:** every className on the rendered elements — `flex-grow flex items-center justify-center p-4 md:p-8`, `flex flex-col md:flex-row max-w-5xl w-full gap-8 md:gap-16`, `w-full md:w-1/2 space-y-8 md:space-y-12`, `w-full md:w-1/2 flex items-center justify-center`, `relative w-full` — must match `page.js` exactly.

- [ ] **Step 2: Rewrite `page.js` as a thin server component**

Open `src/app/contact/page.js` and replace the **entire file** with:

```jsx
import ContactHeading from './_components/ContactHeading';
import ContactHero from './_components/ContactHero';
import ContactCV from './_components/ContactCV';

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ContactHeading />
      <ContactHero />
      <ContactCV />
    </div>
  );
}
```

No `'use client'` directive. No hook calls. No imports of `framer-motion`, `next/image`, or `useLanguage`. This file is now a pure server component.

**Why a separate `ContactHeading` component?** The sr-only `<h1>` needs `t('sidebar.contact')`, which calls `useLanguage()`, which is a client hook. If we inlined the `<h1>` in `page.js`, `page.js` would need `'use client'` again — defeating the whole point of this task. Isolating the heading into its own tiny client component (Step 3) lets `page.js` stay on the server.

- [ ] **Step 3: Create `ContactHeading.jsx`**

Create `src/app/contact/_components/ContactHeading.jsx`:

```jsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function ContactHeading() {
  const { t } = useLanguage();
  return <h1 className="sr-only">{t('sidebar.contact')}</h1>;
}
```

This is the only reason the `<h1>` needs a dedicated file: it reads `useLanguage()`, which is a client context, so it cannot live in the server `page.js`. It's a four-line file — acceptable because it isolates a single client dependency.

- [ ] **Step 4: Lint and build**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint && npm run build
```

Expected: pass. The build output should show `/contact` as a regular page; it will still be dynamic because two of its children are client components, but `page.js` itself is now a server component (no `'use client'` at the top, no hook calls).

- [ ] **Step 5: Visual + keyboard verification (full regression)**

Start dev server, visit `http://localhost:3000/contact`:

1. **Layout** — two-column hero with info on the left, GIF on the right. On mobile, they stack with GIF below info.
2. **Entry animations** — reload the page; confirm the left column slides in from the left and the right column slides in from the right with a slight delay.
3. **CV accordion** — toggles open/closed; chevron rotates; all 12 entries visible when open.
4. **Language toggle** — ES↔EN: bio, section headings, CV entries, CV toggle label, sidebar label all re-translate.
5. **Email** — click it; mail composer opens with `contacto.ceteo@gmail.com` pre-filled.
6. **Instagram** — click it; new tab opens to Instagram.
7. **Keyboard** — Tab through: focus moves through email → Instagram → CV toggle, each turning red on focus.
8. **Screen reader** — landmarks list shows three sections; `<h1>` "CONTACT-ABOUT" / "CONTACTO-ACERCA" is read on page load.
9. **Mobile viewport** — resize to 375×812; layout stacks cleanly; no horizontal scroll.

Compare screenshots against baselines in `/tmp/contact-baseline-*.png`. They should be visually indistinguishable except for (a) no initial layout shift on the GIF, (b) visible focus rings when tabbing.

- [ ] **Step 6: Commit**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git add src/app/contact/_components/ContactHero.jsx src/app/contact/_components/ContactHeading.jsx src/app/contact/page.js && git commit -m "$(cat <<'EOF'
contact: extract <ContactHero> + convert page.js to server component

- New src/app/contact/_components/ContactHero.jsx owns the two-column hero
  + Framer Motion entry animations + GIF
- New src/app/contact/_components/ContactHeading.jsx isolates the sr-only <h1>
  (only reason: useLanguage() is a client hook)
- page.js drops 'use client', becomes pure composition (server component)

No visual change. See spec §3.7, §4.1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Final verification ✅

**Goal:** Confirm the full refactor is clean — lint, build, manual regression, and a diff summary against the pre-cleanup baseline.

- [ ] **Step 1: Clean build**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && rm -rf .next && npm run build
```

Expected: full production build passes with no errors and no new warnings vs. Task 0 baseline.

- [ ] **Step 2: Lint**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && npm run lint
```

Expected: no warnings or errors.

- [ ] **Step 3: File inventory check**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && find src/app/contact -type f | sort
```

Expected output (exactly these files):

```
src/app/contact/_components/ContactCV.jsx
src/app/contact/_components/ContactHeading.jsx
src/app/contact/_components/ContactHero.jsx
src/app/contact/_components/ContactSection.jsx
src/app/contact/_data/about.js
src/app/contact/_data/cv.js
src/app/contact/layout.js
src/app/contact/page.js
```

- [ ] **Step 4: LOC sanity check**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && wc -l src/app/contact/page.js src/app/contact/_components/*.jsx src/app/contact/_data/*.js
```

Expected rough targets (not strict):

```
page.js                ~15 lines  (was 257)
ContactHero.jsx        ~65 lines
ContactCV.jsx          ~60 lines
ContactSection.jsx     ~15 lines
ContactHeading.jsx     ~8 lines
about.js               ~7 lines
cv.js                  ~150 lines (data)
```

If `page.js` is larger than ~30 lines, something was left behind.

- [ ] **Step 5: Full visual regression**

Start dev server (`npm run dev`). In a browser, walk through the regression checklist from Task 7 Step 5 one final time. Capture comparison screenshots to `/tmp/contact-after-*.png` and diff against `/tmp/contact-baseline-*.png` (visual inspection — no automated tooling needed).

Expected deltas:

| Thing | Before | After |
|---|---|---|
| GIF layout shift on load | pops in | reserved box |
| Tab focus ring on email/Instagram/CV | invisible | red text |
| Dead `border-t border-white` | invisible | removed |
| Everything else | — | pixel-identical |

- [ ] **Step 6: Diff summary**

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git diff --stat <baseline-SHA-from-task-0>..HEAD -- src/app/contact
```

Expected: ~8 files changed, roughly +300/-250 lines (numbers approximate — the important bit is that `page.js` shrank by ~240 lines and the new component/data files absorbed them).

- [ ] **Step 7: Update memory**

This refactor adds structural conventions that future work should follow. Save a memory entry.

Add a new memory file at `/Users/teo/.claude/projects/-Users-teo-Proyectos-PortafolioCETEO/memory/contact_page_structure.md`:

```markdown
---
name: Contact page structural conventions
description: After 2026-04-09 cleanup, /contact follows a split component/data layout that other route refactors can model after
type: project
---
After the 2026-04-09 structural cleanup, `src/app/contact/` follows this layout:

- `page.js` — server component, pure composition only (~15 lines)
- `_components/` — `ContactHero` (client, hero + motion), `ContactCV` (client, accordion),
  `ContactSection` (dumb wrapper, server-safe), `ContactHeading` (client, sr-only h1)
- `_data/` — `about.js` (ABOUT_TEXT), `cv.js` (CV_ITEMS), plain JS bilingual literals

**Why:** `LanguageContext` is a client context, so any component that calls `t()` must be
`'use client'`. Splitting the page into small client islands lets `page.js` itself be a
server component (smaller RSC payload, cleaner SSR).

**How to apply:** If refactoring other routes (`/artworks`, `/photography`, etc.) and
you find inlined bilingual data or a monolithic client page, use this layout as the
template. Follow-up not yet done: move `ABOUT_TEXT` + `CV_ITEMS` strings into `src/i18n/dict.js`.
```

Then add this line to `/Users/teo/.claude/projects/-Users-teo-Proyectos-PortafolioCETEO/memory/MEMORY.md`:

```markdown
- [Contact page structure](contact_page_structure.md) — reference layout for splitting bilingual client pages into server composition + client islands
```

- [ ] **Step 8: Final commit**

Only if any uncommitted files remain from memory updates or similar:

```bash
cd /Users/teo/Proyectos/PortafolioCETEO && git status
```

If clean, nothing to commit. Plan complete.

---

## Open questions escalated to Task 8 reviewer

Before merging this work (e.g., into `main` or opening a PR), confirm with the maintainer:

1. **Invisible border** — the `border-t border-white` we removed in Task 1 was invisible, but maybe a separator was *intended*. If so, what color? Follow-up PR adds it back with the approved tone.
2. **GIF alt text** — `t('contact.altGif')` still returns "Animated graphic". Is the GIF decorative (→ `alt=""`) or content (→ descriptive text)? Not touched in this plan because it requires designer input; see spec §7 question 2.
3. **`'2021 - X'` convention** — literal `X` kept verbatim. Confirm it should stay, or change to "Present"/"Presente" as a follow-up (spec §7 question 4).
4. **GIF → video swap** — explicitly deferred; 4.1 MB payload is the biggest perf lever on this page. Separate plan worth doing once the designer greenlights MP4/WebM encoding.

---

## Follow-up plans (not this plan, but worth scheduling)

### 7.1 Focus ring polish

Tasks 2 and the subsequent refactors all use `focus-visible:text-red-500 focus:outline-none`. This matches the existing hover color but removes the default browser outline entirely. If a stronger keyboard indication is desired, a follow-up can add a subtle `focus-visible:ring-1 focus-visible:ring-red-500` without changing mouse appearance. Designer call.

### 7.2 Move bio + CV strings into `dict.js`

The data modules `_data/about.js` and `_data/cv.js` currently hold the strings directly. A clean follow-up:

1. Add `contact.aboutText` as `{ es, en }` under `dict.js`.
2. Add stable CV IDs (e.g. `telematics`, `bachelorArts`, `toma1`, …) and move `title` + `institution` per-ID under `dict.js`.
3. Keep `period` values (language-agnostic) in `_data/cv.js` as `CV_ITEM_IDS`.
4. `ContactHero` and `ContactCV` then call `t('contact.aboutText')` and `t(`contact.cvItems.${id}.title`)` etc.

This is purely i18n consistency — no visual or behavior change — but it's a second refactor on top of the present one and should ship as its own PR to keep review scope manageable.

### 7.3 GIF → video

The biggest unhandled perf win. Needs:

- Designer sign-off on acceptable encoding (H.264 MP4 + VP9 WebM).
- Re-encode the GIF once; ship both files.
- Replace the `<Image>` with `<video autoPlay loop muted playsInline poster>` wrapped in a simple client component.
- Compare frame 1 against the GIF's first frame to confirm visual continuity.

Typical savings: ~4.1 MB → ~400 KB.

### 7.4 Reusable `motion/presets.js`

Task 7 duplicated the two entry-animation configs (`{ opacity, x, transition }`). If other routes adopt this pattern, a shared `src/components/motion/presets.js` with `fadeSlideInLeft`, `fadeSlideInRight` is worth it. Not worth it for a single page.

---

## Summary

Eight tasks. Seven commits (Task 0 is verification only, Task 8 is optional memory update). Every task:

- Targets a single well-scoped region of the page
- Commits independently and is revertable in isolation
- Includes exact file paths, complete code snippets, exact commands
- Has an explicit visual verification step against the baseline screenshots

End state: `page.js` shrinks from 257 to ~15 lines. Data moves to `_data/`. Accordion, hero, section wrapper, and the sr-only heading each live in their own file. Zero visible pixel change. Two silent bugs fixed. Four accessibility improvements land. The page is ready for follow-up work (dict.js consolidation, GIF→video swap) without further structural churn.
