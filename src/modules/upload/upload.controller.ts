import {
  Controller, Post, Query, UploadedFile, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @RequirePermissions('upload:create')
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', enum: ['products', 'avatars', 'banners'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: 'products' | 'avatars' | 'banners',
  ) {
    return this.uploadService.processImage(file, folder || 'products');
  }

  @Post('images')
  @RequirePermissions('upload:create')
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: 'products' | 'avatars' | 'banners',
  ) {
    return this.uploadService.processMultiple(files, folder || 'products');
  }
}
