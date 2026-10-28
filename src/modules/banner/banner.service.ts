import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';

@Injectable()
export class BannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create banner with direct image file upload
   */
  async create(dto: CreateBannerDto, imageFile: Express.Multer.File) {
    if (!imageFile) {
      throw new BadRequestException('Banner image file is required');
    }

    // Upload banner image directly to Cloudinary
    const imageUrl = await this.cloudinaryService.uploadImage(
      imageFile,
      'tatka-bajar/banners',
    );

    return this.prisma.banner.create({
      data: {
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() || null,
        tag: dto.tag?.trim() || null,
        tagColor: dto.tagColor?.trim() || '#FF6B35',
        imageUrl,
        linkType: dto.linkType,
        linkValue: dto.linkValue.trim(),
        discountPercent: dto.discountPercent !== undefined ? Number(dto.discountPercent) : null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        sortOrder: dto.sortOrder !== undefined ? Number(dto.sortOrder) : 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  /**
   * Public endpoint: Get active, currently scheduled banners
   */
  async findAllPublic() {
    const now = new Date();

    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Admin endpoint: Get all banners with pagination and filter
   */
  async findAllAdmin(query: QueryBannerDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.linkType) {
      where.linkType = query.linkType;
    }

    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      banners,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single banner by ID
   */
  async findOne(bannerId: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { bannerId },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${bannerId} not found`);
    }

    return banner;
  }

  /**
   * Update banner with optional replacement image file
   */
  async update(
    bannerId: string,
    dto: UpdateBannerDto,
    newImageFile?: Express.Multer.File,
  ) {
    const existing = await this.findOne(bannerId);

    let imageUrl = existing.imageUrl;
    if (newImageFile) {
      imageUrl = await this.cloudinaryService.uploadImage(
        newImageFile,
        'tatka-bajar/banners',
      );
      // Clean up previous image asynchronously
      this.cloudinaryService.deleteImage(existing.imageUrl).catch(() => {});
    }

    return this.prisma.banner.update({
      where: { bannerId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        subtitle: dto.subtitle !== undefined ? dto.subtitle.trim() : undefined,
        tag: dto.tag !== undefined ? dto.tag.trim() : undefined,
        tagColor: dto.tagColor !== undefined ? dto.tagColor.trim() : undefined,
        linkType: dto.linkType !== undefined ? dto.linkType : undefined,
        linkValue: dto.linkValue !== undefined ? dto.linkValue.trim() : undefined,
        discountPercent:
          dto.discountPercent !== undefined ? Number(dto.discountPercent) : undefined,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : undefined,
        sortOrder: dto.sortOrder !== undefined ? Number(dto.sortOrder) : undefined,
        startsAt: dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : undefined,
        endsAt: dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : undefined,
        imageUrl,
      },
    });
  }

  /**
   * Directly upload and replace banner image file
   */
  async updateImage(bannerId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Banner image file is required');
    }

    const banner = await this.findOne(bannerId);

    const imageUrl = await this.cloudinaryService.uploadImage(
      file,
      'tatka-bajar/banners',
    );

    // Delete old image
    this.cloudinaryService.deleteImage(banner.imageUrl).catch(() => {});

    return this.prisma.banner.update({
      where: { bannerId },
      data: { imageUrl },
    });
  }

  /**
   * Delete banner and remove image from Cloudinary
   */
  async remove(bannerId: string) {
    const banner = await this.findOne(bannerId);

    // Remove from Cloudinary
    await this.cloudinaryService.deleteImage(banner.imageUrl);

    await this.prisma.banner.delete({
      where: { bannerId },
    });

    return { message: 'Banner deleted successfully', bannerId };
  }
}

