import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductSortBy, QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${randomSuffix}`;
  }

  /**
   * Helper to format product with pricing, discount, and review calculations
   */
  private formatProduct(product: any) {
    const totalRatings = product.reviews?.length || 0;
    const avgRating =
      totalRatings > 0
        ? Number(
            (
              product.reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) /
              totalRatings
            ).toFixed(1),
          )
        : null;

    const isDiscountActive = Boolean(
      product.isDiscount && product.discountPrice && product.discountPrice < product.price,
    );

    const effectivePrice = isDiscountActive ? product.discountPrice : product.price;

    const discountPercent = isDiscountActive
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

    const savings = isDiscountActive
      ? Number((product.price - product.discountPrice).toFixed(2))
      : 0;

    const { reviews, ...rest } = product;

    return {
      ...rest,
      effectivePrice,
      discountPercent,
      savings,
      averageRating: avgRating,
      totalReviews: totalRatings,
    };
  }

  async create(dto: CreateProductDto) {
    // If no categoryId is provided, fallback to the default 'other' category
    let categoryId = dto.categoryId;
    if (!categoryId) {
      const otherCategory = await this.prisma.category.findFirst({
        where: { slug: 'other' },
      });
      if (otherCategory) {
        categoryId = otherCategory.categoryId;
      } else {
        throw new BadRequestException('categoryId is required');
      }
    }

    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category not found with ID: ${categoryId}`);
    }

    if (!category.isActive) {
      throw new BadRequestException('Cannot add product to an inactive category');
    }

    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    // Handle discount logic (toggle, percent, or fixed price)
    let isDiscount = dto.isDiscount ?? false;
    let resolvedDiscountPrice = dto.discountPrice;

    // If discountPercent is passed and discountPrice is omitted, compute discountPrice
    if (dto.discountPercent && !resolvedDiscountPrice) {
      resolvedDiscountPrice = Number(
        (dto.price * (1 - dto.discountPercent / 100)).toFixed(2),
      );
      isDiscount = true;
    }

    if (isDiscount) {
      if (!resolvedDiscountPrice) {
        throw new BadRequestException(
          'discountPrice or discountPercent is required when isDiscount toggle is enabled',
        );
      }
      if (resolvedDiscountPrice <= 0) {
        throw new BadRequestException('discountPrice must be greater than 0');
      }
      if (resolvedDiscountPrice >= dto.price) {
        throw new BadRequestException(
          `discountPrice (${resolvedDiscountPrice}) must be strictly less than selling price (${dto.price})`,
        );
      }
    } else {
      // If discount is not enabled, ensure discountPrice is cleared
      resolvedDiscountPrice = null;
    }

    const created = await this.prisma.product.create({
      data: {
        categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        images: dto.images || [],
        unit: dto.unit ?? 'KG',
        unitValue: dto.unitValue ?? 1.0,
        buyPrice: dto.buyPrice ?? 0,
        price: dto.price,
        discountPrice: resolvedDiscountPrice,
        isDiscount,
        stock: dto.stock ?? 0,
        location: dto.location,
        isOrganic: dto.isOrganic ?? false,
        isSeasonal: dto.isSeasonal ?? false,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: {
          select: { categoryId: true, name: true, slug: true, emoji: true },
        },
      },
    });

    return this.formatProduct(created);
  }

  async findAll(query: QueryProductDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.categoryId) {
      where.category = {
        OR: [{ categoryId: query.categoryId }, { slug: query.categoryId }],
      };
    }

    if (query.inStock === true) {
      where.stock = { gt: 0 };
    }

    if (query.isDiscount === true) {
      where.isDiscount = true;
    }

    if (query.isOrganic !== undefined) {
      where.isOrganic = query.isOrganic;
    }

    if (query.isSeasonal !== undefined) {
      where.isSeasonal = query.isSeasonal;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = Number(query.minPrice);
      if (query.maxPrice !== undefined) where.price.lte = Number(query.maxPrice);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === ProductSortBy.PRICE_ASC) {
      orderBy = { price: 'asc' };
    } else if (query.sortBy === ProductSortBy.PRICE_DESC) {
      orderBy = { price: 'desc' };
    } else if (query.sortBy === ProductSortBy.NAME_ASC) {
      orderBy = { name: 'asc' };
    } else if (query.sortBy === ProductSortBy.BEST_SELLING) {
      orderBy = { totalSold: 'desc' };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { categoryId: true, name: true, slug: true, emoji: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
    ]);

    const formatted = products.map((prod) => this.formatProduct(prod));

    return {
      products: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(searchTerm: string, page = 1, limit = 12) {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.findAll({ page, limit });
    }

    const cleanTerm = searchTerm.trim();
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: cleanTerm, mode: 'insensitive' } },
        { description: { contains: cleanTerm, mode: 'insensitive' } },
        { location: { contains: cleanTerm, mode: 'insensitive' } },
        { category: { name: { contains: cleanTerm, mode: 'insensitive' } } },
      ],
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ totalSold: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: {
            select: { categoryId: true, name: true, slug: true, emoji: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
    ]);

    const formatted = products.map((prod) => this.formatProduct(prod));

    return {
      products: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ productId: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: {
          select: { categoryId: true, name: true, slug: true, emoji: true },
        },
        reviews: {
          include: {
            user: {
              select: { userId: true, name: true, profile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${idOrSlug}`);
    }

    return this.formatProduct(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [{ productId: id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category not found: ${dto.categoryId}`);
      }
    }

    const sellPrice = dto.price ?? existing.price;
    let isDiscount = dto.isDiscount !== undefined ? dto.isDiscount : existing.isDiscount;
    let resolvedDiscountPrice =
      dto.discountPrice !== undefined ? dto.discountPrice : existing.discountPrice;

    // If discountPercent is provided, recalculate discountPrice
    if (dto.discountPercent && dto.discountPrice === undefined) {
      resolvedDiscountPrice = Number(
        (sellPrice * (1 - dto.discountPercent / 100)).toFixed(2),
      );
      isDiscount = true;
    }

    if (isDiscount) {
      if (!resolvedDiscountPrice) {
        throw new BadRequestException(
          'discountPrice or discountPercent is required when isDiscount toggle is true',
        );
      }
      if (resolvedDiscountPrice <= 0) {
        throw new BadRequestException('discountPrice must be greater than 0');
      }
      if (resolvedDiscountPrice >= sellPrice) {
        throw new BadRequestException(
          `discountPrice (${resolvedDiscountPrice}) must be less than selling price (${sellPrice})`,
        );
      }
    } else {
      // Clear discount price when toggle is off
      resolvedDiscountPrice = null;
    }

    const { discountPercent: _ignoredPercent, ...cleanDto } = dto;
    const updateData: any = {
      ...cleanDto,
      isDiscount,
      discountPrice: resolvedDiscountPrice,
    };

    const updated = await this.prisma.product.update({
      where: { productId: existing.productId },
      data: updateData,
      include: {
        category: {
          select: { categoryId: true, name: true, slug: true, emoji: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return this.formatProduct(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [{ productId: id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    // Soft delete — keeps order history intact
    const removed = await this.prisma.product.update({
      where: { productId: existing.productId },
      data: { isActive: false },
    });

    return {
      productId: removed.productId,
      name: removed.name,
      isActive: removed.isActive,
      message: 'Product soft-deleted successfully',
    };
  }

  async appendImages(id: string, newImageUrls: string[]) {
    const existing = await this.findOne(id);
    const updatedImages = [...(existing.images || []), ...newImageUrls];

    const updated = await this.prisma.product.update({
      where: { productId: existing.productId },
      data: { images: updatedImages },
      include: {
        category: {
          select: { categoryId: true, name: true, slug: true, emoji: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return this.formatProduct(updated);
  }

  async removeImage(id: string, imageUrl: string) {
    const existing = await this.findOne(id);
    const updatedImages = (existing.images || []).filter((img: string) => img !== imageUrl);

    const updated = await this.prisma.product.update({
      where: { productId: existing.productId },
      data: { images: updatedImages },
      include: {
        category: {
          select: { categoryId: true, name: true, slug: true, emoji: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return this.formatProduct(updated);
  }
}
