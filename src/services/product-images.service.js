import { uploadFile, deleteImagesByUrls } from './s3.service.js';

function groupVariantFiles(files = []) {
  const grouped = {};
  for (const file of files) {
    const match = file.fieldname?.match(/^images_(\d+)$/);
    if (!match) continue;
    const index = parseInt(match[1], 10);
    if (!grouped[index]) grouped[index] = [];
    grouped[index].push(file);
  }
  return grouped;
}

export async function buildVariantsWithImages(variants, files = []) {
  const grouped = groupVariantFiles(files);

  return Promise.all(variants.map(async (variant, index) => {
    const existing = variant.existingImages || [];
    const uploads = grouped[index] || [];
    const uploadedUrls = await Promise.all(
      uploads.map((file) => uploadFile(file.buffer, 'products', file.originalname, file.mimetype))
    );

    const { existingImages, ...rest } = variant;
    return {
      ...rest,
      images: [...existing, ...uploadedUrls],
    };
  }));
}

export async function removeOrphanedImages(previousUrls, nextUrls) {
  const keep = new Set(nextUrls);
  const orphaned = previousUrls.filter((url) => !keep.has(url));
  await deleteImagesByUrls(orphaned);
}
