
export const projects = {
  photography: {
    'autorretrato': {
      title: 'autorretrato',
      images: [
        {
          type: 'image',
          src: '/images/Autorretrato/1.jpg',
          alt: 'Image 1',
          text: 'Optional text describing this image or series'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/2.jpg',
          alt: 'Image 2'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/3.jpg',
          alt: 'Image 3'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/4.jpg',
          alt: 'Image 4'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/5.jpg',
          alt: 'Image 5'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/6.jpg',
          alt: 'Image 6'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/7.jpg',
          alt: 'Image 7'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/8.jpg',
          alt: 'Image 8'
        },
        {
          type: 'image',
          src: '/images/Autorretrato/9.jpg',
          alt: 'Image 9'
        }
      ]
    },
      'portraits': {
        title: 'Portraits',
        images: []
      }
    },
    motion: {
      'video-art': {
        title: 'video art',
        content: [
          {
            type: 'youtube',
            id: 'KNauRVq7f7c', 
            title: 'Film Title',
            description: 'Film description',
            aspectRatio: '16/9' // o '4/3' según el video
          },
          {
            type: 'image',
            src: '/images/film-still.jpg',
            alt: 'Film still'
          }
        ]
      },
      '3D-animation':{
        title:'3D animation'  
      }
    },
    essays: {
      'writtenwork': {
        title: 'Written Work',
        content: [
          {
            type: 'text',
            title: 'Essay Title',
            date: '2024',
            body: `
              Tu texto aquí. Puedes usar formato markdown para:
              
              # Títulos
              ## Subtítulos
              
              Párrafos normales con **negritas** y *cursivas*.
              
              - Listas
              - De items
              
              > Citas o bloques destacados
              
              Incluso puedes incluir [enlaces](https://ejemplo.com)
            `,
            images: [
              {
                src: '/images/essay/image1.jpg',
                alt: 'Descripción de la imagen',
                caption: 'Texto debajo de la imagen'
              }
            ]
          }
        ]
      }
    },
    artwork: {
      'ST': {
        title: 'ST',
        images: [
          {
            type: 'image',
            src: '/images/Autorretrato/1.jpg',
            alt: 'Image 1',
            text: 'textoo'
          }
        ]
      }
    },

  };
  
  export function getProject(category, projectId) {
    return projects[category]?.[projectId] || null;
  }
  
  export function getProjectContent(category, projectId) {
    const project = getProject(category, projectId);
    if (!project) return null;
  
    return {
      ...project,
      category,
      projectId
    };
  }