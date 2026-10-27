import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const USER_SELECT = {
  userId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  profile: true,
  isVerified: true,
  isNotification: true,
  isAgree: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; profile?: string },
  ) {
    await this.getProfile(userId);

    return this.prisma.user.update({
      where: { userId },
      data,
      select: {
        userId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profile: true,
        isVerified: true,
        updatedAt: true,
      },
    });
  }

  async getAllUsers(role?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) {
      where.role = role.toUpperCase();
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPEND') {
    const user = await this.getProfile(userId);

    return this.prisma.user.update({
      where: { userId: user.userId },
      data: { status },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  async updateUserRole(userId: string, role: 'ADMIN' | 'USER' | 'RIDER') {
    const user = await this.getProfile(userId);

    const updated = await this.prisma.user.update({
      where: { userId: user.userId },
      data: { role },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // If assigned RIDER role, ensure Rider profile exists
    if (role === 'RIDER') {
      await this.prisma.rider.upsert({
        where: { userId: user.userId },
        create: { userId: user.userId },
        update: { isActive: true },
      });
    }

    return updated;
  }

  async getAllRiders() {
    return this.prisma.rider.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  }
}
