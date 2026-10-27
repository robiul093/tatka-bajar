import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { productId: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found with ID: ${dto.productId}`);
    }

    return this.prisma.review.upsert({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: { userId: true, name: true, profile: true },
        },
      },
    });
  }

  async findByProduct(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { productId } }),
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        include: {
          user: {
            select: { userId: true, name: true, profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(userId: string, reviewId: string, isAdmin = false) {
    const review = await this.prisma.review.findUnique({
      where: { reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    return this.prisma.review.delete({
      where: { reviewId },
    });
  }
}
