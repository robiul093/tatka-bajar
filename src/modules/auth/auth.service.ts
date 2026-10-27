import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserSignUpDto } from './dto/user.singup.dto';
import {
  APP_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../../common/constants';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IEnv } from '../../config/env.config';
import { MailService } from '../mail/mail.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpType, ResendOtpDto } from './dto/resend-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async hash(text: string): Promise<string> {
    return bcrypt.hash(text, 10);
  }

  // Alias for backward compatibility
  async hast(text: string): Promise<string> {
    return this.hash(text);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiry(minutes = APP_CONSTANTS.OTP_EXPIRY_MINUTES): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  async userSignUp(data: UserSignUpDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    const checkPhone = await this.prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });

    if (user)
      throw new BadRequestException(ERROR_MESSAGES.USER.USER_ALREADY_EXISTS);
    if (checkPhone)
      throw new BadRequestException(ERROR_MESSAGES.USER.PHONE_ALREADY_EXISTS);

    const hashedPassword = await this.hash(data.password);
    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    const createdUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        role: 'USER',
        status: 'INACTIVE',
        isVerified: false,
        verifiedOtp: otp,
        verifiedOtpExpireAt: otpExpiresAt,
      },
      select: {
        userId: true,
        name: true,
        email: true,
        phone: true,
        profile: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send verification email with OTP
    await this.mailService.sendVerificationOtpEmail(data.email, otp, data.name);

    return createdUser;
  }

  async verifyOtp(data: VerifyOtpDto) {
    const { email, otp } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);
    }

    if (user.isVerified && user.status === 'ACTIVE') {
      return {
        message: 'Account is already verified',
        isVerified: true,
      };
    }

    if (!user.verifiedOtp || user.verifiedOtp !== otp) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.INVALID_OTP);
    }

    if (!user.verifiedOtpExpireAt || user.verifiedOtpExpireAt < new Date()) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.OTP_EXPIRED);
    }

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        isVerified: true,
        status: 'ACTIVE',
        verifiedOtp: null,
        verifiedOtpExpireAt: null,
      },
    });

    return {
      message: SUCCESS_MESSAGES.AUTH.EMAIL_VERIFIED,
      isVerified: true,
    };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const { email } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        resetPasswordOtp: otp,
        resetPasswordExpireAt: otpExpiresAt,
      },
    });

    await this.mailService.sendPasswordResetOtpEmail(
      user.email,
      otp,
      user.name,
    );

    return {
      message: SUCCESS_MESSAGES.AUTH.OTP_SENT,
    };
  }

  async verifyResetOtp(data: VerifyOtpDto) {
    const { email, otp } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.INVALID_OTP);
    }

    if (
      !user.resetPasswordExpireAt ||
      user.resetPasswordExpireAt < new Date()
    ) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.OTP_EXPIRED);
    }

    return {
      message: 'OTP verified successfully',
      valid: true,
    };
  }

  async resetPassword(data: ResetPasswordDto) {
    const { email, otp, newPassword } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.INVALID_OTP);
    }

    if (
      !user.resetPasswordExpireAt ||
      user.resetPasswordExpireAt < new Date()
    ) {
      throw new BadRequestException(ERROR_MESSAGES.AUTH.OTP_EXPIRED);
    }

    const hashedPassword = await this.hash(newPassword);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        password: hashedPassword,
        resetPasswordOtp: null,
        resetPasswordExpireAt: null,
      },
    });

    return {
      message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET,
    };
  }

  async resendOtp(data: ResendOtpDto) {
    const { email, type = OtpType.VERIFICATION } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    if (type === OtpType.RESET_PASSWORD) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: {
          resetPasswordOtp: otp,
          resetPasswordExpireAt: otpExpiresAt,
        },
      });

      await this.mailService.sendPasswordResetOtpEmail(
        user.email,
        otp,
        user.name,
      );
    } else {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: {
          verifiedOtp: otp,
          verifiedOtpExpireAt: otpExpiresAt,
        },
      });

      await this.mailService.sendVerificationOtpEmail(
        user.email,
        otp,
        user.name,
      );
    }

    return {
      message: SUCCESS_MESSAGES.AUTH.OTP_SENT,
    };
  }

  async signIn(data: LoginDto) {
    const { email } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPEND') {
      throw new ForbiddenException('Account suspended');
    }

    if (!user.isVerified || user.status === 'INACTIVE') {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.ACCOUNT_NOT_VERIFIED);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid)
      throw new NotFoundException(ERROR_MESSAGES.AUTH.INVALID_PASSWORD);

    const tokens = await this.generateTokens(user.userId, user.email);

    await this.updateRefreshToken(user.userId, tokens.refreshToken);

    const {
      password: _password,
      verifiedOtp: _verifiedOtp,
      verifiedOtpExpireAt: _verifiedOtpExpireAt,
      resetPasswordOtp: _resetPasswordOtp,
      resetPasswordExpireAt: _resetPasswordExpireAt,
      refreshToken: _refreshToken,
      ...rest
    } = user;

    return {
      message: SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
      tokens,
      user: rest,
    };
  }

  async findUser(id: string) {
    if (!id) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        userId: id,
      },
    });

    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER.USER_NOT_FOUND);

    const {
      password: _password,
      verifiedOtp: _verifiedOtp,
      verifiedOtpExpireAt: _verifiedOtpExpireAt,
      resetPasswordOtp: _resetPasswordOtp,
      resetPasswordExpireAt: _resetPasswordExpireAt,
      refreshToken: _refreshToken,
      ...rest
    } = user;

    return rest;
  }

  async generateTokens(userId: string, email: string) {
    const env = this.configService.get<IEnv>('env');
    const payload = {
      sub: userId,
      id: userId,
      userId: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env?.JWT_CONFIG.JWT_SECRET,
      expiresIn: '7d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: env?.JWT_CONFIG.JWT_REFRESH_SECRET,
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { userId: userId },
      data: {
        refreshToken: hashed,
      },
    });
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId: userId },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user.userId, user.email);

    await this.updateRefreshToken(user.userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { userId: userId },
      data: {
        refreshToken: null,
      },
    });

    return {
      message: SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS,
    };
  }
}
