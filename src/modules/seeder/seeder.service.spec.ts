import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { SeederService } from './seeder.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SeederService', () => {
  let service: SeederService;
  let prismaService: any;
  let configService: any;

  const mockSeederConfig = {
    ADMIN: {
      NAME: 'Admin User',
      EMAIL: 'admin@example.com',
      PASSWORD: 'Password@123',
      PHONE: '+8801700000001',
    },
    USER: {
      NAME: 'Default User',
      EMAIL: 'user@example.com',
      PASSWORD: 'Password@123',
      PHONE: '+8801700000002',
    },
    RIDER: {
      NAME: 'Default Rider',
      EMAIL: 'rider@example.com',
      PASSWORD: 'Password@123',
      PHONE: '+8801700000003',
    },
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'env') {
          return { SEEDER_CONFIG: mockSeederConfig };
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip seeding if user with email already exists', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      userId: 'existing-id',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    await service.seed();

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    });
    expect(prismaService.user.create).not.toHaveBeenCalled();
  });

  it('should create users for all roles when they do not exist', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    prismaService.user.create.mockResolvedValue({ userId: 'new-id' });

    await service.seed();

    expect(prismaService.user.create).toHaveBeenCalledTimes(3);
    expect(prismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'admin@example.com',
          role: Role.ADMIN,
          isVerified: true,
        }),
      }),
    );
  });
});
