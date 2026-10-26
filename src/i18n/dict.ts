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
      cvShow: 'Show {count} entries ↓',
      cvHide: 'Hide ↑',
      location: 'SANTIAGO, CL',
      present: 'present',
      aboutText:
        'Mateo Cereceda is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.',
    },
    modal: { close: 'Close', prev: 'Previous image', next: 'Next image' },
    games: {
      score: 'SCORE',
      high: 'HIGH',
      status: 'STATUS',
      gameOver: 'GAME OVER',
      kick: {
        hint: 'WASD / ARROWS MOVE · SPACE JUMP · MOUSE LOOK · R-CLICK KICK',
        start: 'CLICK TO START',
        playing: 'ESC PAUSE',
      },
      coinpush: {
        title: 'empuja monedas',
        hint: 'TYPE + ENTER · SPACE DROP · ARROWS / MOUSE ROTATE',
      },
      shooter: {
        title: 'art shooter',
        hint: 'CLICK PLAY · MOUSE AIM · CLICK SHOOT · ESC EXIT',
        clickToPlay: 'CLICK TO PLAY',
        escExit: 'ESC EXIT',
        touch: 'DRAG TO LOOK · TAP TO SHOOT',
      },
    },
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
      cvShow: 'Ver {count} entradas ↓',
      cvHide: 'Ocultar ↑',
      location: 'SANTIAGO, CL',
      present: 'presente',
      aboutText:
        'Mateo Cereceda es un artista de nuevos medios radicado en Santiago, Chile. Actualmente trabaja en la intersección entre el arte digital y la instalación escultórica experimental.',
    },
    modal: { close: 'Cerrar', prev: 'Imagen anterior', next: 'Imagen siguiente' },
    games: {
      score: 'PUNTOS',
      high: 'RÉCORD',
      status: 'ESTADO',
      gameOver: 'FIN DEL JUEGO',
      kick: {
        hint: 'WASD / FLECHAS MOVER · ESPACIO SALTAR · MOUSE MIRAR · CLICK DER. PATEAR',
        start: 'CLICK PARA EMPEZAR',
        playing: 'ESC PAUSA',
      },
      coinpush: {
        title: 'empuja monedas',
        hint: 'ESCRIBE + ENTER · ESPACIO SOLTAR · FLECHAS / MOUSE GIRAR',
      },
      shooter: {
        title: 'art shooter',
        hint: 'CLICK JUGAR · MOUSE APUNTAR · CLICK DISPARAR · ESC SALIR',
        clickToPlay: 'CLICK PARA JUGAR',
        escExit: 'ESC SALIR',
        touch: 'ARRASTRA PARA MIRAR · TOCA PARA DISPARAR',
      },
    },
    experimental: {
      warning: 'Estos proyectos pueden afectar el rendimiento del navegador o redirigirte externamente.',
    },
  },
} as const

export type Lang = keyof typeof dict
