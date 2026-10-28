import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { NotificationType } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'u1', isNotification: true }),
      findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]),
      update: jest.fn().mockResolvedValue({ userId: 'u1' }),
    },
    notification: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ notificationId: 'n1', ...data })),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ notificationId: 'n1', userId: 'u1', isRead: false }),
      update: jest.fn().mockResolvedValue({ notificationId: 'n1', isRead: true }),
      updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      delete: jest.fn().mockResolvedValue({ notificationId: 'n1' }),
      count: jest.fn().mockResolvedValue(3),
    },
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/promo.jpg'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create notification for user with active notifications', async () => {
    const result = await service.createNotification({
      userId: 'u1',
      title: 'Order Shipped',
      body: 'Your order is out for delivery',
      type: NotificationType.DELIVERY,
    });

    expect(result).toBeDefined();
    expect(result?.title).toBe('Order Shipped');
  });

  it('should get unread count', async () => {
    const res = await service.getUnreadCount('u1');
    expect(res.unreadCount).toBe(3);
  });

  it('should mark all notifications as read', async () => {
    const res = await service.markAllAsRead('u1');
    expect(res.updatedCount).toBe(5);
  });
});

