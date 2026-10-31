import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dict, type Lang } from './dict'
import { rememberLang } from './detect'

type Params = Record<string, string | number>
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, params?: Params) => string }

const LanguageContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k })

function interpolate(template: string, params?: Params) {
  if (!params) return template
  return template.replace(/\{(.*?)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

function lookup(lang: Lang, key: string): string | undefined {
  let node: any = dict[lang] ?? dict.en
  for (const p of key.split('.')) {
    node = node?.[p]
    if (node == null) return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (next) => {
        const l = next === 'es' ? 'es' : 'en'
        rememberLang(l)
        setLangState(l)
      },
      t: (key, params) => interpolate(lookup(lang, key) ?? lookup('en', key) ?? key, params),
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
