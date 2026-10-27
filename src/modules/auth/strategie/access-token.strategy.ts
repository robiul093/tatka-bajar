import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { IEnv } from '../../../config/env.config';

@Injectable()
export class AtStrategy extends PassportStrategy(JwtStrategy, 'jwt') {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const env = configService.get<IEnv>('env');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env?.JWT_CONFIG.JWT_SECRET as string,
    });
  }

  async validate(payload: any) {
    const userId = payload.sub || payload.id || payload.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'SUSPEND') {
      throw new ForbiddenException('Account suspended');
    }

    return {
      id: user.userId,
      userId: user.userId,
      sub: user.userId,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }
}
