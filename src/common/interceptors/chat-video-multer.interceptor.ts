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
import { uploadVideoBuffer } from '../../helpers/cloudinary.helper';
const multer = ((multerNs as any)?.default ?? (multerNs as any)) as any;

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `feedback_${timestamp}_${random}${extension}`;
}

@Injectable()
export class ChatVideoMulterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const contentType = (req.headers['content-type'] || '').toString();
    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }
    const allowed = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only video files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }).single('video');

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
          const file = (req as any).file;
          if (!file?.buffer) {
            subscriber.error(new BadRequestException('No video provided'));
            return;
          }
          const filename = generateFileName(file.originalname);
          const { secureUrl } = await uploadVideoBuffer(
            file.buffer,
            filename,
            'sellvio/chat/feedback',
          );
          (file as any).cloudinaryUrl = secureUrl;
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
