import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { v2 as Cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
  ) {}

  /**
   * Upload single image buffer to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = 'tatka-bajar/general',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No image file provided for upload');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, AVIF.`,
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Image file size must not exceed 5MB');
    }

    const safePublicId = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return new Promise<string>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: safePublicId,
          resource_type: 'image',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload error:', error);
            return reject(
              new BadRequestException(error?.message || 'Failed to upload image to cloud storage'),
            );
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload multiple image buffers to Cloudinary in parallel
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder = 'tatka-bajar/products',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided for upload');
    }

    const MAX_FILES = 8;
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`Cannot upload more than ${MAX_FILES} images at once`);
    }

    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  /**
   * Delete an image from Cloudinary by its public ID or full URL
   */
  async deleteImage(publicIdOrUrl: string): Promise<void> {
    if (!publicIdOrUrl) return;

    try {
      // If full Cloudinary URL is passed, extract public ID
      let publicId = publicIdOrUrl;
      if (publicIdOrUrl.includes('cloudinary.com')) {
        const parts = publicIdOrUrl.split('/upload/');
        if (parts.length > 1) {
          const afterUpload = parts[1];
          // Strip version tag (e.g. v1700000000/) if present
          const cleanPath = afterUpload.replace(/^v\d+\//, '');
          // Strip extension
          publicId = cleanPath.substring(0, cleanPath.lastIndexOf('.')) || cleanPath;
        }
      }

      await this.cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
      this.logger.warn(`Could not delete image (${publicIdOrUrl}): ${err.message}`);
    }
  }
}
