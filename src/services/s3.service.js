import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config/index.js';

import { v4 as uuidv4 } from 'uuid';



let s3Client = null;



function getS3() {

  if (!s3Client && config.aws.accessKeyId) {

    s3Client = new S3Client({

      region: config.aws.region,

      credentials: {

        accessKeyId: config.aws.accessKeyId,

        secretAccessKey: config.aws.secretAccessKey,

      },

    });

  }

  return s3Client;

}



function buildKey(folder, filename) {

  const prefix = config.aws.prefix ? `${config.aws.prefix}/` : '';

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return `${prefix}${folder}/${uuidv4()}-${safeName}`;

}



function toPublicUrl(key) {

  if (config.aws.cloudfrontUrl) {

    return `${config.aws.cloudfrontUrl}/${key}`;

  }

  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

}



export function urlToS3Key(url) {

  if (!url || typeof url !== 'string') return null;



  if (config.aws.cloudfrontUrl && url.startsWith(config.aws.cloudfrontUrl)) {

    return url.slice(config.aws.cloudfrontUrl.length + 1);

  }



  const bucket = config.aws.bucket;

  if (!bucket) return null;



  const patterns = [

    new RegExp(`https?://${bucket}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`),

    new RegExp(`https?://s3\\.[^/]+\\.amazonaws\\.com/${bucket}/(.+)`),

  ];



  for (const pattern of patterns) {

    const match = url.match(pattern);

    if (match) return decodeURIComponent(match[1]);

  }



  return null;

}



export async function uploadFile(buffer, folder, filename, contentType) {

  const key = buildKey(folder, filename);

  const client = getS3();



  if (!client || !config.aws.bucket) {

    return `https://placehold.co/600x800?text=DK+Clothing`;

  }



  await client.send(new PutObjectCommand({

    Bucket: config.aws.bucket,

    Key: key,

    Body: buffer,

    ContentType: contentType,

    ACL: 'public-read',

  }));



  return toPublicUrl(key);

}



export async function deleteS3Keys(keys) {

  const client = getS3();

  const unique = [...new Set(keys.filter(Boolean))];

  if (!client || !config.aws.bucket || !unique.length) return;



  await client.send(new DeleteObjectsCommand({

    Bucket: config.aws.bucket,

    Delete: { Objects: unique.map((Key) => ({ Key })) },

  }));

}



export async function deleteImagesByUrls(urls) {

  const keys = urls.map(urlToS3Key).filter(Boolean);

  await deleteS3Keys(keys);

}



export function collectProductImageUrls(product) {

  return (product?.variants || []).flatMap((v) => v.images || []).filter(Boolean);

}



export async function getPresignedUploadUrl({ folder, filename, contentType }) {

  const client = getS3();

  const key = buildKey(folder, filename);



  if (!client || !config.aws.bucket) {

    return {

      uploadUrl: null,

      key,

      publicUrl: `https://placehold.co/600x800?text=DK+Clothing`,

      mock: true,

    };

  }



  const command = new PutObjectCommand({

    Bucket: config.aws.bucket,

    Key: key,

    ContentType: contentType,

    ACL: 'public-read',

  });



  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return { uploadUrl, key, publicUrl: toPublicUrl(key) };

}



export async function uploadBuffer(key, buffer, contentType, { isPublic = true } = {}) {
  const client = getS3();
  if (!client) return null;

  await client.send(new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ...(isPublic ? { ACL: 'public-read' } : {}),
  }));

  return isPublic ? toPublicUrl(key) : key;
}

export async function getObjectBuffer(key) {
  const client = getS3();
  if (!client || !config.aws.bucket || !key) return null;

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
    }));
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}


