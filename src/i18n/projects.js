// Traducciones opcionales por proyecto y por item de contenido.
// Estructura: projectTranslations[category][projectId]
// - title?: { en?: string, es?: string }
// - items?: Array<{ title?, text?, alt? }>
// Cada propiedad admite { en, es }. Si no existe, se usa el valor original.

export const projectTranslations = {
  photography: {
    yofelia: {
      title: { en: 'yofelia', es: 'yofelia' },
      items: [
        {
          text: {
            en: 'Based on selfportrait sculpture. Photowork in conjunction with @latermitta (2024)',
            es: 'Basado en una escultura de autorretrato. Trabajo fotográfico en conjunto con @latermitta (2024)'
          }
        }
      ]
    }
  },

  motion: {
    'virtual-reality': {
      items: [
        {
          text: {
            en: 'VR experience developed in Godot engine',
            es: 'Experiencia de realidad virtual desarrollada en el motor Godot'
          }
        }
      ]
    }
  },

  thrdworks: {
    photogrammetry: {
      title: { en: '3D works', es: 'Trabajos 3D' },
      items: [
        {
          title: { en: 'Foot scan', es: 'Escaneo de pie' },
          description: { en: 'Foot scan', es: 'Escaneo de pie' }
        },
        {
          title: { en: 'UC1', es: 'UC1' },
          description: { en: 'UC1', es: 'UC1' }
        },
        {
          title: { en: 'UC2', es: 'UC2' },
          description: { en: 'UC2', es: 'UC2' }
        }
      ]
    },
    organic: {
      title: { en: '3D works', es: 'Trabajos 3D' },
      items: [
        {
          title: { en: 'Foot scan', es: 'Escaneo de pie' },
          description: { en: 'Foot scan', es: 'Escaneo de pie' }
        },
        {
          title: { en: 'UC1', es: 'UC1' },
          description: { en: 'UC1', es: 'UC1' }
        },
        {
          title: { en: 'UC2', es: 'UC2' },
          description: { en: 'UC2', es: 'UC2' }
        }
      ]
    }
  },

  artworks: {
    traducciones: {
      title: { en: 'traducciones', es: 'traducciones' },
      items: [
        {
          text: {
            en: 'Multimedia installation exploring digital translation and materiality. An internet-sourced 3D scan transitions between physical and virtual states. Manifesting as both a 3D printed artifact and an augmented reality presence. (2024)',
            es: 'Instalación multimedia que explora la traducción digital y la materialidad. Un escaneo 3D obtenido de internet transita entre estados físicos y virtuales. Se manifiesta tanto como un artefacto impreso en 3D como una presencia en realidad aumentada. (2024)'
          }
        },
        , ,
        {},
        {
          title: { en: 'Translations video', es: 'Video de traducciones' }
        }
      ]
    },

    'atento-sargento': {
      title: { en: 'atento sargento', es: 'atento sargento' },
      items: [
        {
          text: {
            en: 'Interactive installation where footage from the Gaza conflict remains frozen in time until met by a viewers gaze. (2023)',
            es: 'Instalación interactiva donde imágenes del conflicto en Gaza permanecen congeladas en el tiempo hasta encontrarse con la mirada del espectador. (2023)'
          }
        }
      ]
    },

    tomautoma: {
      title: { en: 'tomautoma', es: 'tomautoma' },
      items: [
        {
          text: {
            en: "Interactive installation where each viewers facial features contribute to an evolving digital portrait. (2023)",
            es: 'Instalación interactiva donde los rasgos faciales de cada espectador contribuyen a un retrato digital en constante evolución. (2023)'
          }
        }
      ]
    },

    autorretrato: {
      title: { en: 'autorretrato', es: 'autorretrato' },
      items: [
        {
          text: {
            en: 'Kinetic sculpture. A suspended torso connected to deteriorating machinery produces sound without achieving nothing more than spasms. (2024)',
            es: 'Escultura cinética. Un torso suspendido conectado a maquinaria en deterioro produce sonido sin lograr más que espasmos. (2024)'
          }
        },
        {},
        {}
      ]
    },

    'una-flor-para-otra...': {
      title: { en: 'una flor para otra...', es: 'una flor para otra...' },
      items: [
        {
          text: {
            en: 'Interactive installation examining the inherent biases in facial recognition systems. (2023)',
            es: 'Instalación interactiva que examina los sesgos inherentes en los sistemas de reconocimiento facial. (2023)'
          }
        }
      ]
    },

    'para-ti-esto-es-un-juego': {
      title: { en: 'para ti esto es un juego', es: 'para ti esto es un juego' },
      items: [
        {
          text: {
            en: "Installation where augmented reality markers on balloons create a dynamic space of interaction. Digital stick figures mirror viewers movements while appropriating their facial features. (2024)",
            es: 'Instalación donde marcadores de realidad aumentada en globos crean un espacio dinámico de interacción. Figuras digitales simulan los movimientos de los espectadores apropiándose de sus rasgos faciales. (2024)'
          }
        },
        {},
        {
          title: { en: 'Video', es: 'Video' }
        }
      ]
    },

    reparando: {
      title: { en: 'repairing', es: 'reparando' },
      items: [
        {
          text: {
            en: '“Repairing” An inquiry into the intersections between the artificial and the organic—the mechanical and the human. (2025)',
            es: '“Reparando” Una indagación en las intersecciones entre lo artificial y lo orgánico—lo mecánico y lo humano. (2025)'
          }
        },
        {},
        {
          title: { en: 'Repairing Video 1', es: 'Reparando Video 1' }
        },
        {
          title: { en: 'Repairing Video 2', es: 'Reparando Video 2' }
        }
      ]
    },

    'sistemas-del-cuerpo': {
      title: { en: 'body systems', es: 'sistemas del cuerpo' },
      items: [
        {
          text: {
            en: 'Sculptural installation. Based on human condition. (2025)',
            es: 'Instalación escultórica. Basada en la condición humana. (2025)'
          }
        }
      ]
    },

    'te-juro-que-es-primera-vez-que-me-pasa': {
      title: { en: "I swear this is the first time it happens", es: 'te juro que es primera vez que me pasa' },
      items: [
        {
          text: {
            en: "Interactive installation. Indio Pícaro reacts based on how hegemonic the spectator's facial features are. Work in conjunction with Marco Gómez. (2025)",
            es: 'Instalación interactiva. El Indio Pícaro reacciona según cuán hegemónicos sean los rasgos faciales del espectador. Trabajo en conjunto con Marco Gómez. (2025)'
          }
        },
        {}, {}, {}, {},
        {
          title: { en: 'Video', es: 'Video' }
        }
      ]
    },

    'santiago-1': {
      title: { en: 'santiago 1', es: 'santiago 1' },
      items: [
        {
          text: {
            en: '',
            es: ''
          }
        }
      ]
    },

    'medium': {
      title: { en: 'medium', es: 'médium' },
      items: [
        {
          text: {
            en: '',
            es: ''
          }
        },
        {
          title: { en: 'Medium Video', es: 'Video Médium' }
        }
      ]
    },

    'donante-universal': {
      title: { en: 'universal donor', es: 'donante universal' },
      items: [
        {
          text: {
            en: '',
            es: ''
          }
        },
        {
          title: { en: 'Universal Donor Video', es: 'Video Donante Universal' }
        }
      ]
    }
  }
};


