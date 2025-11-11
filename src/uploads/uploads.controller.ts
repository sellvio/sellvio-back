import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @ApiOperation({ summary: 'Upload a single image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: '/uploads/images/img_1712345678_123456789.png',
        },
        filename: { type: 'string', example: 'img_1712345678_123456789.png' },
        mimetype: { type: 'string', example: 'image/png' },
        size: { type: 'number', example: 345678 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = ensureUploadsDir();
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, generateFileName(file.originalname));
        },
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
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicUrl = `/uploads/images/${file.filename}`;
    return {
      url: publicUrl,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
