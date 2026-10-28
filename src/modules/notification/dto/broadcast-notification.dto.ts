import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export enum BroadcastTargetRole {
  ALL = 'ALL',
  USER = 'USER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Flash Sale: 20% off all Seasonal Fruits!' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Grab fresh Rajshahi mangoes, guavas and watermelons today only with code FRESH20.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    default: NotificationType.PROMOTION,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.PROMOTION;

  @ApiPropertyOptional({
    enum: BroadcastTargetRole,
    default: BroadcastTargetRole.ALL,
    description: 'Target audience role filter',
  })
  @IsEnum(BroadcastTargetRole)
  @IsOptional()
  targetRole?: BroadcastTargetRole = BroadcastTargetRole.ALL;

  @ApiPropertyOptional({ example: 'https://tatkabajar.com/campaign/fresh-deals' })
  @IsString()
  @IsOptional()
  linkUrl?: string;
}

