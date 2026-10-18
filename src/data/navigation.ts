export type Category = { key: string; labelKey: string; projects: string[] }

export const CATEGORIES: Category[] = [
  {
    key: 'artworks',
    labelKey: 'artworks',
    projects: [
      'donante-universal',
      'medium',
      'santiago-1',
      'te-juro-que-es-primera-vez-que-me-pasa',
      'para-ti-esto-es-un-juego',
      'una-flor-para-otra...',
      'autorretrato',
      'tomautoma',
      'atento-sargento',
      'traducciones',
      'sistemas-del-cuerpo',
      'reparando',
    ],
  },
  { key: 'photography', labelKey: 'photography', projects: ['yofelia'] },
  { key: 'motion', labelKey: 'motion', projects: ['video-art', 'animation', 'virtual-reality'] },
  { key: 'thrdworks', labelKey: 'models3d', projects: ['photogrammetry'] },
  { key: 'experimental', labelKey: 'experimental', projects: ['medio condoro', 'empuja-monedas'] },
  { key: 'texts', labelKey: 'texts', projects: ['statement'] },
]

/** Projects that leave the site. */
export const EXTERNAL_PROJECTS: Record<string, string> = {
  'medio condoro': 'https://www.maquinacondor.com',
}

export const projectLabel = (slug: string) => slug.replace(/-/g, ' ')
