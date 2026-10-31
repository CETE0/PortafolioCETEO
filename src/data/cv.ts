type L = { en: string; es: string }
export type CvItem = { period: string; title: L; institution: L }

const same = (s: string): L => ({ en: s, es: s })
const PUC = same('Pontificia Universidad Católica de Chile')
const TOMA: L = { en: 'Production & Curation', es: 'Producción y Curaduría' }

/** `{present}` is replaced with the localized word for "present". */
export const CV_ITEMS: CvItem[] = [
  { period: '2021', title: { en: 'Telematics Civil Engineering (first year)', es: 'Ingeniería Civil Telemática (primer año)' }, institution: same('Universidad Técnica Federico Santa María') },
  { period: '2022 – 2025', title: { en: 'Bachelor of Arts', es: 'Licenciatura en Artes' }, institution: PUC },
  { period: '2022', title: { en: 'Full Stack Web Development Bootcamp', es: 'Bootcamp de Desarrollo Web Full Stack' }, institution: same('Universidad del Desarrollo') },
  { period: '2024', title: { en: 'TOMA#1 Exhibition', es: 'Exposición TOMA#1' }, institution: TOMA },
  { period: '2024', title: { en: 'TOMA#2 Exhibition', es: 'Exposición TOMA#2' }, institution: TOMA },
  { period: '2024', title: { en: 'Undergraduate Teaching Assistant — Photogrammetry and 3D Modeling', es: 'Ayudante Pregrado — Fotogrametría y Modelado 3D' }, institution: PUC },
  { period: '2025', title: { en: 'Laboratory Assistant LAITEC', es: 'Ayudante Laboratorio LAITEC' }, institution: PUC },
  { period: '2025', title: { en: 'Graduate Teaching Assistant — Laboratory of Interdisciplinary Creation in Arts and Technology', es: 'Ayudante Posgrado — Laboratorio de Creación Interdisciplinaria en Artes y Tecnología' }, institution: PUC },
  { period: '2025', title: { en: 'TOMA#3 Exhibition', es: 'Exposición TOMA#3' }, institution: TOMA },
  { period: '2025', title: { en: 'TOMA#4 Exhibition', es: 'Exposición TOMA#4' }, institution: TOMA },
  { period: '2025', title: { en: '17th Santiago Media Arts Biennial', es: '17 Bienal de Artes Mediales de Santiago' }, institution: { en: 'TOMA Colectivo — Production Assistant', es: 'TOMA Colectivo — Asistente de Producción' } },
  { period: '2026', title: { en: 'Graduate Teaching Assistant — LAITEC Interdisciplinary Laboratory', es: 'Ayudante Posgrado — Laboratorio Interdisciplinario LAITEC' }, institution: PUC },
  { period: '2026', title: { en: 'Bachelor of Engineering (BEng) — Open UAS Path Studies, Information Technology', es: 'Bachelor of Engineering (BEng) — Estudios Open UAS Path, Tecnologías de la Información' }, institution: same('Metropolia University of Applied Sciences') },
]
