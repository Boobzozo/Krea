// Compression / redimensionnement des images côté navigateur, AVANT l'envoi au serveur.
// Une photo de téléphone (5-8 Mo) devient ~200-500 Ko : l'import ne "mouline" plus
// et la base de données ne se retrouve pas gonflée par des images en base64.

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image invalide'));
    img.src = src;
  });
}

/**
 * Redimensionne l'image pour que son plus grand côté ne dépasse pas `maxDim`,
 * puis la ré-encode en JPEG compressé. Retourne une data-URL base64 prête à envoyer.
 * En cas de souci (format exotique, navigateur ancien), renvoie le fichier tel quel.
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return fileToDataURL(file);
  }

  try {
    const dataUrl = await fileToDataURL(file);
    const img = await loadImage(dataUrl);

    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', quality);

    // Si la compression n'a rien gagné (petite image déjà légère), on garde l'original.
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    // Repli : envoyer le fichier tel quel plutôt que d'échouer.
    return fileToDataURL(file);
  }
}
