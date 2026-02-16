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
import { uploadImageBuffer } from '../../helpers/cloudinary.helper';
const multer = ((multerNs as any)?.default ?? (multerNs as any)) as any;

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `chat_${timestamp}_${random}${extension}`;
}

@Injectable()
export class ChatImagesMulterInterceptor implements NestInterceptor {
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
    }).array('images', 5);

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
          const files = (req.files || []) as Array<any>;
          if (files.length === 0) {
            subscriber.error(new BadRequestException('No images provided'));
            return;
          }
          for (const f of files) {
            if (!f?.buffer) continue;
            const filename = generateFileName(f.originalname);
            const { secureUrl } = await uploadImageBuffer(
              f.buffer,
              filename,
              'sellvio/chat/images',
            );
            (f as any).cloudinaryUrl = secureUrl;
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
