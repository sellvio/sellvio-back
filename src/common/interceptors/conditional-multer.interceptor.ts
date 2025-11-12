import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multer from 'multer';
import { extname } from 'path';
import { uploadImageBuffer } from '../../helpers/cloudinary.helper';

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `img_${timestamp}_${random}${extension}`;
}

@Injectable()
export class ConditionalMulterInterceptor implements NestInterceptor {
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
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }).fields([
      { name: 'profile_image_url', maxCount: 1 },
      { name: 'logo_url', maxCount: 1 },
      { name: 'business_cover_image_url', maxCount: 1 },
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
          const fieldNames = [
            'profile_image_url',
            'logo_url',
            'business_cover_image_url',
          ] as const;
          for (const field of fieldNames) {
            const f = files[field]?.[0];
            if (f && f.buffer) {
              const filename = generateFileName(f.originalname);
              const { secureUrl, publicId } = await uploadImageBuffer(
                f.buffer,
                filename,
                'sellvio/images',
              );
              // Attach Cloudinary info for downstream usage
              (f as any).cloudinaryUrl = secureUrl;
              (f as any).cloudinaryPublicId = publicId;
            }
          }
          // Proceed to next handler
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
