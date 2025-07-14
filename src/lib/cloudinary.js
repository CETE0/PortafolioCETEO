/**
 * Genera URLs optimizadas de Cloudinary
 * @param {string} publicId - ID público de la imagen (path sin extensión)
 * @param {Object} options - Opciones de transformación
 * @returns {string} URL optimizada
 */
export function getCloudinaryUrl(publicId, options = {}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloud_name_here';
  
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
    ...otherOptions
  } = options;

  // Construir transformaciones
  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  // Agregar transformaciones adicionales
  Object.entries(otherOptions).forEach(([key, value]) => {
    transformations.push(`${key}_${value}`);
  });

  const transformationString = transformations.length > 0 
    ? `/${transformations.join(',')}`
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload${transformationString}/${publicId}`;
}

/**
 * Mapeo de imágenes locales a IDs de Cloudinary
 * Actualizar estos IDs después de subir las imágenes
 */
export const imageMap = {
  // Apropiación Digital/Física
  '/images/apropiaciondigifisica/1.JPG': 'portfolio/apropiaciondigifisica/1',
  '/images/apropiaciondigifisica/2.JPG': 'portfolio/apropiaciondigifisica/2',
  '/images/apropiaciondigifisica/3.JPG': 'portfolio/apropiaciondigifisica/3',
  
  // Atención Sargento
  '/images/atencionsargento/1.jpg': 'portfolio/atencionsargento/1',
  '/images/atencionsargento/2.jpg': 'portfolio/atencionsargento/2',
  '/images/atencionsargento/3.jpeg': 'portfolio/atencionsargento/3',
  
  // Autómata
  '/images/Automata1/1.jpg': 'portfolio/automata1/1',
  '/images/Automata1/2.jpg': 'portfolio/automata1/2',
  '/images/Automata1/3.jpg': 'portfolio/automata1/3',
  '/images/Automata1/4.jpg': 'portfolio/automata1/4',
  
  // Autorretrato
  '/images/Autorretrato/1.jpg': 'portfolio/autorretrato/1',
  '/images/Autorretrato/2.jpg': 'portfolio/autorretrato/2',
  '/images/Autorretrato/3.jpg': 'portfolio/autorretrato/3',
  '/images/Autorretrato/4.jpg': 'portfolio/autorretrato/4',
  '/images/Autorretrato/5.jpg': 'portfolio/autorretrato/5',
  '/images/Autorretrato/6.jpg': 'portfolio/autorretrato/6',
  '/images/Autorretrato/7.jpg': 'portfolio/autorretrato/7',
  '/images/Autorretrato/8.jpg': 'portfolio/autorretrato/8',
  '/images/Autorretrato/9.jpg': 'portfolio/autorretrato/9',
  '/images/Autorretrato/10.JPG': 'portfolio/autorretrato/10',
  
  // Cuídate Flor
  '/images/CuidateFlor/1.JPG': 'portfolio/cuidateflor/1',
  '/images/CuidateFlor/2.JPG': 'portfolio/cuidateflor/2',
  '/images/CuidateFlor/3.JPG': 'portfolio/cuidateflor/3',
  '/images/CuidateFlor/4.JPG': 'portfolio/cuidateflor/4',
  
  // Para ti esto es un juego
  '/images/para-ti-esto-es-un-juego/1.JPG': 'portfolio/para-ti-esto-es-un-juego/1',
  '/images/para-ti-esto-es-un-juego/2.JPG': 'portfolio/para-ti-esto-es-un-juego/2',
  
  // Autorretrato 3
  '/images/autorretrato3/IMG_7237.JPG': 'portfolio/autorretrato3/img_7237',
  
  // Peristalsis
  '/images/peristalsis/1.jpg': 'portfolio/peristalsis/1',
  '/images/peristalsis/2.jpg': 'portfolio/peristalsis/2',
  '/images/peristalsis/3.jpg': 'portfolio/peristalsis/3',
  '/images/peristalsis/4.jpg': 'portfolio/peristalsis/4',
  '/images/peristalsis/5.jpg': 'portfolio/peristalsis/5',
  '/images/peristalsis/6.jpg': 'portfolio/peristalsis/6',
  
  // Pícaro
  '/images/picaro/1.jpg': 'portfolio/picaro/1',
  '/images/picaro/2.jpg': 'portfolio/picaro/2',
  '/images/picaro/3.jpg': 'portfolio/picaro/3',
  '/images/picaro/4.jpg': 'portfolio/picaro/4',
  '/images/picaro/5.jpg': 'portfolio/picaro/5',
  
  // Reparando
  '/images/reparando/1.jpg': 'portfolio/reparando/1',
  '/images/reparando/2.jpg': 'portfolio/reparando/2',
  
  // FTW
  '/images/FTW/1.JPG': 'portfolio/ftw/1',
  '/images/FTW/2.jpeg': 'portfolio/ftw/2',
  
  // Game assets (mantener locales por ahora)
  '/images/game/background.png': '/images/game/background.png',
  '/images/game/plinth/1.png': '/images/game/plinth/1.png',
  '/images/game/object/1.png': '/images/game/object/1.png',
  '/images/game/leg/1.png': '/images/game/leg/1.png',
};

/**
 * Convierte una ruta local a URL de Cloudinary
 * @param {string} localPath - Ruta local de la imagen
 * @param {Object} options - Opciones de transformación
 * @returns {string} URL de Cloudinary o ruta local si no está mapeada
 */
export function getOptimizedImageUrl(localPath, options = {}) {
  const cloudinaryId = imageMap[localPath];
  
  if (!cloudinaryId) {
    // Si no está mapeada, devolver la ruta local
    return localPath;
  }
  
  if (cloudinaryId.startsWith('/')) {
    // Si empieza con /, es una ruta local (game assets)
    return cloudinaryId;
  }
  
  // Generar URL de Cloudinary
  return getCloudinaryUrl(cloudinaryId, options);
} 