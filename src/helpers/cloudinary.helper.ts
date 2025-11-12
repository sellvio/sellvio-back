import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary env vars are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  filename?: string,
  folder: string = 'sellvio/images',
): Promise<{ secureUrl: string; publicId: string }> {
  ensureConfigured();
  const publicIdBase =
    filename?.replace(/\.[a-zA-Z0-9]+$/, '') || `img_${Date.now()}`;
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdBase,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error || new Error('Cloudinary upload failed without error'),
          );
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}
