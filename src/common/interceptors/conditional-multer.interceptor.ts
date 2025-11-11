import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { diskStorage } from 'multer';
import * as multer from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

function ensureUploadsDir(): string {
  const baseDir = join(process.cwd(), 'uploads');
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  const imagesDir = join(baseDir, 'images');
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const extension = extname(originalName).toLowerCase();
  return `img_${timestamp}_${random}${extension}`;
}

@Injectable()
export class ConditionalMulterInterceptor implements NestInterceptor {
  private readonly upload: any;

  constructor() {
    this.upload = multer({
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ensureUploadsDir()),
        filename: (_req, file, cb) =>
          cb(null, generateFileName(file.originalname)),
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
          'image/gif',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }).fields([
      { name: 'profile_image_url', maxCount: 1 },
      { name: 'logo_url', maxCount: 1 },
      { name: 'business_cover_image_url', maxCount: 1 },
    ]);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const contentType = (req.headers['content-type'] || '').toString();
    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }
    return from(
      new Promise<void>((resolve, reject) => {
        this.upload(req, res, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }).then(() => next.handle().toPromise()),
    );
  }
}
