import { Test, TestingModule } from '@nestjs/testing';
import { AtStrategy } from './access-token.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('AtStrategy', () => {
  let strategy: AtStrategy;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtStrategy,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              JWT_CONFIG: {
                JWT_SECRET: 'test-jwt-secret-key-12345678901234',
              },
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<AtStrategy>(AtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user containing id, userId, sub, email, role, status', async () => {
    prisma.user.findUnique.mockResolvedValue({
      userId: 'user-uuid-1',
      email: 'john@example.com',
      role: 'USER',
      status: 'ACTIVE',
    });

    const result = await strategy.validate({
      sub: 'user-uuid-1',
      email: 'john@example.com',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
    });
    expect(result).toEqual({
      id: 'user-uuid-1',
      userId: 'user-uuid-1',
      sub: 'user-uuid-1',
      email: 'john@example.com',
      role: 'USER',
      status: 'ACTIVE',
    });
  });

  it('should support payload where id is provided instead of sub', async () => {
    prisma.user.findUnique.mockResolvedValue({
      userId: 'user-uuid-2',
      email: 'jane@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const result = await strategy.validate({
      id: 'user-uuid-2',
      email: 'jane@example.com',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-2' },
    });
    expect(result.id).toBe('user-uuid-2');
  });

  it('should throw ForbiddenException if user is SUSPEND', async () => {
    prisma.user.findUnique.mockResolvedValue({
      userId: 'suspended-user',
      status: 'SUSPEND',
    });

    await expect(strategy.validate({ sub: 'suspended-user' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'missing-user' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
