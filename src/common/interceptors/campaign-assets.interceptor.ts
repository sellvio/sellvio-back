import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multerNs from 'multer';
import { extname } from 'path';
import {
  uploadImageBuffer,
  uploadVideoBuffer,
} from '../../helpers/cloudinary.helper';
const multer = ((multerNs as any)?.default ?? (multerNs as any)) as any;

function generateFileName(originalName: string, prefix: 'img' | 'vid'): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `${prefix}_${timestamp}_${random}${extension}`;
}

@Injectable()
export class CampaignAssetsMulterInterceptor implements NestInterceptor {
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const contentType = (req.headers['content-type'] || '').toString();
    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }
    const allowed = [
      // images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      // videos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg',
      'video/webm',
      'video/3gpp',
    ];
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB for videos
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only image/video files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }).fields([
      { name: 'asset_files', maxCount: 10 },
      { name: 'campaign_image_url', maxCount: 1 },
    ]);

    return new Observable((subscriber) => {
      upload(req, res, async (err: any) => {
        if (err) {
          subscriber.error(
            err instanceof Error
              ? err
              : new BadRequestException('File upload failed'),
          );
          return;
        }
        try {
          const files = (req.files || {}) as Record<string, Array<any>>;
          const assets = files['asset_files'] || [];
          const campaignImage = files['campaign_image_url']?.[0];
          for (const f of assets) {
            if (!f?.buffer) continue;
            // Decide resource type by mimetype
            const isVideo = String(f.mimetype).startsWith('video/');
            const filename = generateFileName(
              f.originalname,
              isVideo ? 'vid' : 'img',
            );
            const folder = 'sellvio/campaigns/assets';
            const { secureUrl, publicId } = isVideo
              ? await uploadVideoBuffer(f.buffer, filename, folder)
              : await uploadImageBuffer(f.buffer, filename, folder);
            (f as any).cloudinaryUrl = secureUrl;
            (f as any).cloudinaryPublicId = publicId;
            (f as any).cloudinaryType = isVideo ? 'video' : 'image';
          }
          // Upload campaign cover image if provided
          if (campaignImage?.buffer) {
            const filename = generateFileName(
              campaignImage.originalname,
              'img',
            );
            const folder = 'sellvio/campaigns/covers';
            const { secureUrl, publicId } = await uploadImageBuffer(
              campaignImage.buffer,
              filename,
              folder,
            );
            (campaignImage as any).cloudinaryUrl = secureUrl;
            (campaignImage as any).cloudinaryPublicId = publicId;
          }
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        } catch (e) {
          subscriber.error(e);
        }
      });
    });
  }
}
