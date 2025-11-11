import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { diskStorage } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

function getBaseUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  if (process.env.VERCEL) return '/tmp/uploads';
  return join(process.cwd(), 'uploads');
}

function ensureUploadsDir(): string {
  const baseDir = getBaseUploadsDir();
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
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const contentType = (req.headers['content-type'] || '').toString();
    if (!contentType.includes('multipart/form-data')) {
      return next.handle();
    }
    const options = {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) =>
          cb(null, ensureUploadsDir()),
        filename: (_req: any, file: any, cb: any) =>
          cb(null, generateFileName(file.originalname)),
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
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
    } as const;
    const InterceptorClass = FileFieldsInterceptor(
      [
        { name: 'profile_image_url', maxCount: 1 },
        { name: 'logo_url', maxCount: 1 },
        { name: 'business_cover_image_url', maxCount: 1 },
      ],
      options as any,
    ) as unknown as new () => NestInterceptor;
    const inner = new InterceptorClass();
    return (inner as unknown as NestInterceptor).intercept(
      context,
      next,
    ) as any;
  }
}
