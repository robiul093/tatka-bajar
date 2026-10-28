import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ example: 'uuid-user-id' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Order Confirmed' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your order #ORD-123456 has been confirmed by seller.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.ORDER })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.ORDER;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: { orderId: 'uuid-order-id' } })
  @IsOptional()
  metadata?: any;
}

