import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrismaService = {
    order: {
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 5000 } }),
    },
    user: {
      count: jest.fn().mockResolvedValue(25),
    },
    product: {
      count: jest.fn().mockResolvedValue(50),
      findMany: jest.fn().mockResolvedValue([]),
    },
    category: {
      count: jest.fn().mockResolvedValue(8),
    },
    rider: {
      count: jest.fn().mockResolvedValue(4),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate today stats', async () => {
    const stats = await service.getTodayStats();
    expect(stats).toBeDefined();
    expect(stats.todayOrders).toBe(10);
  });

  it('should calculate overview stats', async () => {
    const overview = await service.getOverviewStats();
    expect(overview).toBeDefined();
    expect(overview.totalProducts).toBe(50);
    expect(overview.totalRevenue).toBe(5000);
  });
});

