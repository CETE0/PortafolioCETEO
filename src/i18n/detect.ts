import { createIsomorphicFn } from '@tanstack/react-start'
import { appendResponseHeader, getCookie, getRequestHeader } from '@tanstack/react-start/server'
import type { Lang } from './dict'

// Set only by the language toggle; otherwise the device language decides.
export const LANG_COOKIE = 'lang'

const toLang = (tag: string | undefined | null): Lang => (tag?.trim().toLowerCase().startsWith('es') ? 'es' : 'en')
const asChoice = (v: string | undefined): Lang | undefined => (v === 'en' || v === 'es' ? v : undefined)

// Primary language of an Accept-Language header, honouring q-values.
function primaryLanguage(header: string | undefined) {
  if (!header) return undefined
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1 }
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0)
    .sort((a, b) => b.q - a.q)[0]?.tag
}

export const detectLang = createIsomorphicFn()
  .server((): Lang => {
    // The HTML differs per visitor, so caches must key on these.
    appendResponseHeader('Vary', 'Accept-Language, Cookie')
    return asChoice(getCookie(LANG_COOKIE)) ?? toLang(primaryLanguage(getRequestHeader('accept-language')))
  })
  .client((): Lang => {
    const cookie = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1]
    return asChoice(cookie) ?? toLang(navigator.language)
  })

export function rememberLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}
