import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  BroadcastNotificationDto,
  BroadcastTargetRole,
} from './dto/broadcast-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationType, Role, Status } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create an in-app notification for a specific user
   */
  async createNotification(dto: CreateNotificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId: dto.userId },
      select: { userId: true, isNotification: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // If user has globally disabled in-app notifications, skip creation
    if (!user.isNotification) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title.trim(),
        body: dto.body.trim(),
        type: dto.type || NotificationType.ORDER,
        imageUrl: dto.imageUrl || null,
        metadata: dto.metadata || null,
      },
    });
  }

  /**
   * Get paginated notifications for the logged-in user
   */
  async getUserNotifications(userId: string, query: QueryNotificationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notifications count for app badge
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      message: 'All notifications marked as read',
      updatedCount: result.count,
    };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { notificationId },
    });

    return { message: 'Notification deleted successfully', notificationId };
  }

  /**
   * Broadcast promotional or system notification with direct image file upload (Admin only)
   */
  async broadcastNotification(
    dto: BroadcastNotificationDto,
    imageFile?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await this.cloudinaryService.uploadImage(
        imageFile,
        'tatka-bajar/notifications',
      );
    }

    const where: any = {
      status: Status.ACTIVE,
      isNotification: true,
    };

    if (dto.targetRole && dto.targetRole !== BroadcastTargetRole.ALL) {
      where.role = dto.targetRole as unknown as Role;
    }

    const targetUsers = await this.prisma.user.findMany({
      where,
      select: { userId: true },
    });

    if (targetUsers.length === 0) {
      return {
        message: 'No active target users found for broadcast',
        recipientCount: 0,
      };
    }

    const notificationsData = targetUsers.map((u) => ({
      userId: u.userId,
      title: dto.title.trim(),
      body: dto.body.trim(),
      type: dto.type || NotificationType.PROMOTION,
      imageUrl,
      metadata: dto.linkUrl ? { linkUrl: dto.linkUrl } : undefined,
    }));

    // Batch insert notifications
    await this.prisma.notification.createMany({
      data: notificationsData,
    });

    return {
      message: 'Broadcast notification sent successfully',
      recipientCount: targetUsers.length,
      targetRole: dto.targetRole || 'ALL',
      imageUrl,
    };
  }

  /**
   * Register or update mobile push device FCM token
   */
  async updateFcmToken(userId: string, fcmToken: string) {
    if (!fcmToken || !fcmToken.trim()) {
      throw new BadRequestException('FCM registration token is required');
    }

    await this.prisma.user.update({
      where: { userId },
      data: { fcmToken: fcmToken.trim() },
    });

    return { message: 'FCM push device token registered successfully' };
  }
}

