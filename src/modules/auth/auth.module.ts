import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AtStrategy } from './strategie/access-token.strategy';
import { AuthController } from './auth.controller';
import { MailModule } from '../mail/mail.module';
import { IEnv } from '../../config/env.config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MailModule,

    // ✅ VERY IMPORTANT
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<IEnv>('env');
        return {
          secret: env?.JWT_CONFIG.JWT_SECRET || process.env.JWT_SECRET!,
          signOptions: {
            expiresIn: '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
