import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export const DEFAULT_CATEGORY_SLUG = 'other';

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultCategory();
  }

  /**
   * Ensures the catch-all "Other" category exists in the system
   */
  async ensureDefaultCategory() {
    try {
      const existing = await this.prisma.category.findFirst({
        where: { slug: DEFAULT_CATEGORY_SLUG },
      });

      if (!existing) {
        await this.prisma.category.create({
          data: {
            name: 'Other',
            slug: DEFAULT_CATEGORY_SLUG,
            emoji: '📦',
            description: 'Miscellaneous and rest of fresh produce items',
            sortOrder: 999,
            isActive: true,
          },
        });
      }
    } catch {
      // In case database connection isn't ready during server start, fail gracefully
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: dto.name }, { slug }],
      },
    });

    if (existing) {
      throw new BadRequestException('Category with this name or slug already exists');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        emoji: dto.emoji,
        description: dto.description,
        image: dto.image,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ categoryId: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        products: {
          where: { isActive: true },
          take: 12,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category not found: ${idOrSlug}`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (category.slug === DEFAULT_CATEGORY_SLUG) {
      if (dto.slug && dto.slug !== DEFAULT_CATEGORY_SLUG) {
        throw new BadRequestException('Cannot modify the slug of the default "Other" category');
      }
      if (dto.isActive === false) {
        throw new BadRequestException('Cannot deactivate the default "Other" category');
      }
    }

    const data: any = { ...dto };

    if (dto.name && !dto.slug && category.slug !== DEFAULT_CATEGORY_SLUG) {
      data.slug = this.generateSlug(dto.name);
    } else if (dto.slug && category.slug !== DEFAULT_CATEGORY_SLUG) {
      data.slug = this.generateSlug(dto.slug);
    }

    return this.prisma.category.update({
      where: { categoryId: category.categoryId },
      data,
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.slug === DEFAULT_CATEGORY_SLUG) {
      throw new BadRequestException('The default "Other" category cannot be deleted or deactivated');
    }

    // Soft delete: mark as inactive instead of hard delete
    return this.prisma.category.update({
      where: { categoryId: category.categoryId },
      data: { isActive: false },
    });
  }
}
