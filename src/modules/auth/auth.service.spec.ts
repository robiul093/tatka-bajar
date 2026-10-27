import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let mailService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('test-token'),
    };

    mailService = {
      sendVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              JWT_CONFIG: {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
              },
            }),
          },
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('userSignUp', () => {
    it('should create an inactive, unverified user with OTP and dispatch email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          userId: 'user-uuid-1',
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          status: data.status,
          isVerified: data.isVerified,
        }),
      );

      const result = await service.userSignUp({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '01712345678',
        password: 'Password@123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'jane@example.com',
            status: 'INACTIVE',
            isVerified: false,
            verifiedOtp: expect.any(String),
            verifiedOtpExpireAt: expect.any(Date),
          }),
        }),
      );
      expect(mailService.sendVerificationOtpEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.any(String),
        'Jane Doe',
      );
      expect(result.isVerified).toBe(false);
      expect(result.status).toBe('INACTIVE');
    });

    it('should throw error if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ userId: 'existing' });

      await expect(
        service.userSignUp({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '01712345678',
          password: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and activate user account', async () => {
      const validExpireAt = new Date(Date.now() + 10 * 60 * 1000);
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'jane@example.com',
        isVerified: false,
        status: 'INACTIVE',
        verifiedOtp: '123456',
        verifiedOtpExpireAt: validExpireAt,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyOtp({
        email: 'jane@example.com',
        otp: '123456',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        data: {
          isVerified: true,
          status: 'ACTIVE',
          verifiedOtp: null,
          verifiedOtpExpireAt: null,
        },
      });
      expect(result.isVerified).toBe(true);
    });

    it('should throw if OTP is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'jane@example.com',
        verifiedOtp: '654321',
        verifiedOtpExpireAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ email: 'jane@example.com', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if OTP is expired', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'jane@example.com',
        verifiedOtp: '123456',
        verifiedOtpExpireAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp({ email: 'jane@example.com', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword and resetPassword', () => {
    it('should generate resetPasswordOtp and send email on forgotPassword', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'jane@example.com',
        name: 'Jane',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({
        email: 'jane@example.com',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        data: expect.objectContaining({
          resetPasswordOtp: expect.any(String),
          resetPasswordExpireAt: expect.any(Date),
        }),
      });
      expect(mailService.sendPasswordResetOtpEmail).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('should reset password when valid OTP is provided', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'jane@example.com',
        resetPasswordOtp: '987654',
        resetPasswordExpireAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword({
        email: 'jane@example.com',
        otp: '987654',
        newPassword: 'BrandNewPassword@123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        data: expect.objectContaining({
          resetPasswordOtp: null,
          resetPasswordExpireAt: null,
          password: expect.any(String),
        }),
      });
      expect(result.message).toBeDefined();
    });
  });

  describe('generateTokens and sub/id consistency', () => {
    it('should sign access token containing sub, id, userId and email', async () => {
      const tokens = await service.generateTokens(
        'user-uuid-123',
        'user@example.com',
      );

      expect(jwt.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-uuid-123',
          id: 'user-uuid-123',
          userId: 'user-uuid-123',
          email: 'user@example.com',
        },
        expect.any(Object),
      );
      expect(tokens.accessToken).toBe('test-token');
      expect(tokens.refreshToken).toBe('test-token');
    });
  });

  describe('findUser', () => {
    it('should find user by id and omit sensitive fields', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashed-password',
        verifiedOtp: '123456',
        verifiedOtpExpireAt: new Date(),
        resetPasswordOtp: '654321',
        resetPasswordExpireAt: new Date(),
        refreshToken: 'refresh-token',
        role: 'USER',
        status: 'ACTIVE',
        isVerified: true,
      });

      const user = await service.findUser('user-uuid-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123' },
      });
      expect(user.userId).toBe('user-uuid-123');
      expect((user as any).password).toBeUndefined();
      expect((user as any).verifiedOtp).toBeUndefined();
      expect((user as any).resetPasswordOtp).toBeUndefined();
      expect((user as any).refreshToken).toBeUndefined();
    });

    it('should throw BadRequestException if id is falsy', async () => {
      await expect(service.findUser('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findUser('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('signIn verification gate', () => {
    it('should reject unverified or inactive users during login', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'user-uuid-1',
        email: 'unverified@example.com',
        isVerified: false,
        status: 'INACTIVE',
        password: await bcrypt.hash('Password@123', 10),
      });

      await expect(
        service.signIn({
          email: 'unverified@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
