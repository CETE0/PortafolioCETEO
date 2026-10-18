const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

async function main() {
  console.log('🚀 Subiendo imágenes de Autorretrato comprimidas...\n');
  
  const localFolder = 'public/images/Autorretrato';
  const cloudinaryFolder = 'portfolio/autorretrato';
  
  const files = fs.readdirSync(localFolder);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif|webp|JPG)$/i.test(file)
  );

  console.log(`📁 Procesando carpeta: ${localFolder} (${imageFiles.length} imágenes)`);

  for (const file of imageFiles) {
    const localPath = path.join(localFolder, file);
    const fileName = path.parse(file).name.toLowerCase();
    const cloudinaryId = `${cloudinaryFolder}/${fileName}`;
    
    await uploadImage(localPath, cloudinaryId);
    
    // Pequeña pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ Subida de Autorretrato completada!');
}

main().catch(console.error); 