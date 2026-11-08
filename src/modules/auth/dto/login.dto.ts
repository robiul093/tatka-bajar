import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'User@123456' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Optional Firebase Cloud Messaging (FCM) device token for push notifications',
    example: 'dK12...fcm_token_example',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
