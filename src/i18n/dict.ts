export const dict = {
  en: {
    common: { siteTitle: 'Mateo Cereceda', changeLanguage: 'Change language' },
    sidebar: {
      artworks: 'ARTWORKS',
      photography: 'PHOTOGRAPHY',
      motion: 'MOTION',
      models3d: '3D MODELS',
      experimental: 'EXPERIMENTAL',
      texts: 'TEXTS',
      contact: 'CONTACT-ABOUT',
    },
    menu: { open: 'Open menu', close: 'Close menu' },
    project: {
      loadingGame: 'Loading game...',
      noContent: 'No content available',
      notFound: 'Project not found',
      prev: 'PREV',
      next: 'NEXT',
    },
    contact: {
      contact: 'Contact',
      about: 'About',
      social: 'Social',
      cv: 'CV',
      cvShow: 'Show {count} entries',
      cvHide: 'Hide',
      present: 'present',
      aboutText:
        'Mateo Cereceda is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.',
    },
    modal: { close: 'Close', prev: 'Previous image', next: 'Next image' },
    experimental: {
      warning: 'These projects may affect browser performance or redirect you externally.',
    },
  },
  es: {
    common: { siteTitle: 'Mateo Cereceda', changeLanguage: 'Cambiar idioma' },
    sidebar: {
      artworks: 'OBRAS',
      photography: 'FOTOGRAFÍA',
      motion: 'ANIMACIÓN',
      models3d: 'MODELOS 3D',
      experimental: 'EXPERIMENTAL',
      texts: 'TEXTOS',
      contact: 'CONTACTO-ACERCA',
    },
    menu: { open: 'Abrir menú', close: 'Cerrar menú' },
    project: {
      loadingGame: 'Cargando juego...',
      noContent: 'Sin contenido disponible',
      notFound: 'Proyecto no encontrado',
      prev: 'ANTERIOR',
      next: 'SIGUIENTE',
    },
    contact: {
      contact: 'Contacto',
      about: 'Acerca de',
      social: 'Social',
      cv: 'CV',
      cvShow: 'Ver {count} entradas',
      cvHide: 'Ocultar',
      present: 'presente',
      aboutText:
        'Mateo Cereceda es un artista de nuevos medios radicado en Santiago, Chile. Actualmente trabaja en la intersección entre el arte digital y la instalación escultórica experimental.',
    },
    modal: { close: 'Cerrar', prev: 'Imagen anterior', next: 'Imagen siguiente' },
    experimental: {
      warning: 'Estos proyectos pueden afectar el rendimiento del navegador o redirigirte externamente.',
    },
  },
} as const

export type Lang = keyof typeof dict
