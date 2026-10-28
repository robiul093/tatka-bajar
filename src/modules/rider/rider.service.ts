import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { QueryRiderDto } from './dto/query-rider.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class RiderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Admin creates a new rider with direct credentials and optional avatar file
   */
  async createRider(
    dto: CreateRiderDto,
    avatarFile?: Express.Multer.File,
  ) {
    // Check if email or phone already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone.trim() },
    });
    if (existingPhone) {
      throw new ConflictException('A user with this phone number already exists');
    }

    // Upload avatar if file is provided
    let profileUrl: string | null = null;
    if (avatarFile) {
      profileUrl = await this.cloudinaryService.uploadImage(
        avatarFile,
        'tatka-bajar/riders',
      );
    }

    const rawPassword = dto.password || 'Rider@1234';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone.trim(),
          password: hashedPassword,
          role: Role.RIDER,
          status: Status.ACTIVE,
          isVerified: true,
          profile: profileUrl,
        },
      });

      const rider = await tx.rider.create({
        data: {
          userId: user.userId,
          isActive: true,
          currentLat: dto.currentLat || null,
          currentLng: dto.currentLng || null,
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              profile: true,
              createdAt: true,
            },
          },
        },
      });

      return {
        ...rider,
        temporaryPassword: dto.password ? undefined : rawPassword,
      };
    });
  }

  /**
   * List all riders with stats and pagination (Admin only)
   */
  async findAll(query: QueryRiderDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      const search = query.search.trim();
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [riders, total] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              profile: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rider.count({ where }),
    ]);

    return {
      riders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single rider by ID with assigned orders
   */
  async findOne(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { riderId },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            profile: true,
            createdAt: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            orderId: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            deliveryLat: true,
            deliveryLng: true,
            deliveredAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    return rider;
  }

  /**
   * Get rider profile for currently authenticated rider
   */
  async getMyProfile(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            profile: true,
          },
        },
        orders: {
          where: {
            status: { in: ['PROCESSING', 'OUT_FOR_DELIVERY'] },
          },
          include: {
            address: true,
            user: {
              select: { name: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found for current user');
    }

    return rider;
  }

  /**
   * Update rider details (name, phone, active status)
   */
  async updateRider(riderId: string, dto: UpdateRiderDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { riderId },
    });
    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.name || dto.phone) {
        if (dto.phone) {
          const phoneExists = await tx.user.findFirst({
            where: {
              phone: dto.phone.trim(),
              userId: { not: rider.userId },
            },
          });
          if (phoneExists) {
            throw new ConflictException('Phone number is already used by another user');
          }
        }

        await tx.user.update({
          where: { userId: rider.userId },
          data: {
            name: dto.name?.trim(),
            phone: dto.phone?.trim(),
          },
        });
      }

      const updatedRider = await tx.rider.update({
        where: { riderId },
        data: {
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              profile: true,
            },
          },
        },
      });

      return updatedRider;
    });
  }

  /**
   * Toggle rider active status (Admin only)
   */
  async toggleStatus(riderId: string, isActive: boolean) {
    const rider = await this.prisma.rider.findUnique({
      where: { riderId },
    });
    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    return this.prisma.rider.update({
      where: { riderId },
      data: { isActive },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update rider real-time GPS coordinates
   */
  async updateLocation(userId: string, currentLat: number, currentLng: number) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });
    if (!rider) {
      throw new NotFoundException('Rider profile not found for current user');
    }

    return this.prisma.rider.update({
      where: { riderId: rider.riderId },
      data: {
        currentLat,
        currentLng,
      },
      select: {
        riderId: true,
        currentLat: true,
        currentLng: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Upload or update rider avatar image file (Admin or Rider)
   */
  async updateAvatar(riderIdOrUserId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    let rider = await this.prisma.rider.findUnique({
      where: { riderId: riderIdOrUserId },
    });

    if (!rider) {
      rider = await this.prisma.rider.findUnique({
        where: { userId: riderIdOrUserId },
      });
    }

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    const avatarUrl = await this.cloudinaryService.uploadImage(
      file,
      'tatka-bajar/riders',
    );

    const user = await this.prisma.user.update({
      where: { userId: rider.userId },
      data: { profile: avatarUrl },
      select: {
        userId: true,
        name: true,
        email: true,
        profile: true,
      },
    });

    return {
      riderId: rider.riderId,
      user,
    };
  }

  /**
   * Deactivate/Delete rider (Admin only)
   */
  async remove(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { riderId },
      include: {
        orders: {
          where: {
            status: { in: ['PROCESSING', 'OUT_FOR_DELIVERY'] },
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    if (rider.orders.length > 0) {
      throw new BadRequestException(
        `Cannot remove rider with ${rider.orders.length} active delivery orders in progress. Please reassign the orders first.`,
      );
    }

    // Soft-deactivate rider & user
    return this.prisma.$transaction(async (tx) => {
      await tx.rider.update({
        where: { riderId },
        data: { isActive: false },
      });

      await tx.user.update({
        where: { userId: rider.userId },
        data: { status: Status.INACTIVE },
      });

      return { message: 'Rider deactivated successfully', riderId };
    });
  }
}

