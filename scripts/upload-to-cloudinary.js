const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mapeo de carpetas locales a IDs de Cloudinary
const uploadMap = [
  { local: 'public/images/apropiaciondigifisica', cloudinary: 'portfolio/apropiaciondigifisica' },
  { local: 'public/images/atencionsargento', cloudinary: 'portfolio/atencionsargento' },
  { local: 'public/images/Automata1', cloudinary: 'portfolio/automata1' },
  { local: 'public/images/Autorretrato', cloudinary: 'portfolio/autorretrato' },
  { local: 'public/images/CuidateFlor', cloudinary: 'portfolio/cuidateflor' },
  { local: 'public/images/para-ti-esto-es-un-juego', cloudinary: 'portfolio/para-ti-esto-es-un-juego' },
  { local: 'public/images/autorretrato3', cloudinary: 'portfolio/autorretrato3' },
  { local: 'public/images/peristalsis', cloudinary: 'portfolio/peristalsis' },
  { local: 'public/images/picaro', cloudinary: 'portfolio/picaro' },
  { local: 'public/images/reparando', cloudinary: 'portfolio/reparando' },
  { local: 'public/images/FTW', cloudinary: 'portfolio/ftw' },
];

async function uploadImage(localPath, cloudinaryId) {
  try {
    console.log(`Subiendo: ${localPath} -> ${cloudinaryId}`);
    
    const result = await cloudinary.uploader.upload(localPath, {
      public_id: cloudinaryId,
      folder: 'portfolio',
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', format: 'auto' }
      ]
    });
    
    console.log(`✅ Subido: ${result.public_id}`);
    return result;
  } catch (error) {
    console.error(`❌ Error subiendo ${localPath}:`, error.message);
    return null;
  }
}

async function uploadFolder(localFolder, cloudinaryFolder) {
  if (!fs.existsSync(localFolder)) {
    console.log(`⚠️  Carpeta no encontrada: ${localFolder}`);
    return;
  }

  const files = fs.readdirSync(localFolder);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
  );

  console.log(`\n📁 Procesando carpeta: ${localFolder} (${imageFiles.length} imágenes)`);

  for (const file of imageFiles) {
    const localPath = path.join(localFolder, file);
    const fileName = path.parse(file).name.toLowerCase();
    const cloudinaryId = `${cloudinaryFolder}/${fileName}`;
    
    await uploadImage(localPath, cloudinaryId);
    
    // Pequeña pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function main() {
  console.log('🚀 Iniciando subida masiva a Cloudinary...\n');
  
  // Verificar configuración
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('❌ Error: Variables de entorno de Cloudinary no configuradas');
    console.log('Asegúrate de tener CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env.local');
    process.exit(1);
  }

  console.log(`📡 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`🔑 API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 6)}...`);
  console.log('');

  // Subir todas las carpetas
  for (const mapping of uploadMap) {
    await uploadFolder(mapping.local, mapping.cloudinary);
  }

  console.log('\n✅ Subida masiva completada!');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Verifica las imágenes en tu dashboard de Cloudinary');
  console.log('2. Actualiza las variables de entorno en .env.local');
  console.log('3. Las URLs se generarán automáticamente usando getOptimizedImageUrl()');
}

// Ejecutar script
main().catch(console.error); 