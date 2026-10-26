const YEAR = /\((\d{4})\)/g
const TRAILING_YEAR = /\s*\(\d{4}\)\s*$/

/** Last `(YYYY)` across the captions, so a project's year lives in its copy rather than a separate field. */
export function projectYear(captions: ReadonlyArray<string | undefined>): string | undefined {
  let year: string | undefined
  for (const caption of captions) {
    for (const m of caption?.matchAll(YEAR) ?? []) year = m[1]
  }
  return year
}

export const stripYear = (caption: string) => caption.replace(TRAILING_YEAR, '')

export const pad2 = (n: number) => String(n).padStart(2, '0')
