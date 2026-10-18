export const SITE = {
  name: 'Mateo Cereceda',
  email: 'mate.cereceda@gmail.com',
  instagram: { handle: '@mateo.cereceda', url: 'https://www.instagram.com/mateo.cereceda/' },
  description:
    'Mateo Cereceda is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.',
  keywords: ['new media art', 'digital art', 'experimental installation', 'Chilean artist', 'Mateo Cereceda'],
}

export const pageTitle = (title?: string) => (title ? `${title} — ${SITE.name}` : SITE.name)
