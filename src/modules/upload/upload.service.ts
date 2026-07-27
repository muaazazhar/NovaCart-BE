import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDest: string;
  private readonly allowedTypes: string[];
  private readonly maxFileSize: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadDest = this.configService.get<string>('upload.dest') || './uploads';
    this.allowedTypes =
      this.configService.get<string[]>('upload.allowedTypes') ||
      ['image/jpeg', 'image/png', 'image/webp'];
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize') || 5242880;

    if (!existsSync(this.uploadDest)) {
      mkdirSync(this.uploadDest, { recursive: true });
    }
    if (!existsSync(join(this.uploadDest, 'products'))) {
      mkdirSync(join(this.uploadDest, 'products'), { recursive: true });
    }
    if (!existsSync(join(this.uploadDest, 'avatars'))) {
      mkdirSync(join(this.uploadDest, 'avatars'), { recursive: true });
    }
    if (!existsSync(join(this.uploadDest, 'banners'))) {
      mkdirSync(join(this.uploadDest, 'banners'), { recursive: true });
    }
  }

  async processImage(
    file: Express.Multer.File,
    folder: 'products' | 'avatars' | 'banners' = 'products',
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed: ${this.allowedTypes.join(', ')}`);
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File too large. Max: ${this.maxFileSize} bytes`);
    }

    const filename = `${randomUUID()}${extname(file.originalname) || '.webp'}`;
    const relativePath = join(folder, filename.replace(extname(filename), '.webp'));
    const absolutePath = join(this.uploadDest, relativePath);

    await sharp(file.buffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(absolutePath);

    const thumbName = filename.replace(extname(filename), '-thumb.webp');
    const thumbRelative = join(folder, thumbName);
    await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 75 })
      .toFile(join(this.uploadDest, thumbRelative));

    const appUrl = this.configService.get<string>('appUrl') || 'http://localhost:3000';
    return {
      message: 'File uploaded',
      data: {
        url: `${appUrl}/uploads/${relativePath.replace(/\\/g, '/')}`,
        thumbnailUrl: `${appUrl}/uploads/${thumbRelative.replace(/\\/g, '/')}`,
        filename: relativePath.replace(/\\/g, '/'),
        size: file.size,
        mimetype: 'image/webp',
      },
    };
  }

  async processMultiple(
    files: Express.Multer.File[],
    folder: 'products' | 'avatars' | 'banners' = 'products',
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');
    const results = [];
    for (const file of files) {
      const result = await this.processImage(file, folder);
      results.push(result.data);
    }
    return { message: 'Files uploaded', data: results };
  }
}
