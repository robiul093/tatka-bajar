import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    example: 'dGhpcy1pcy1hLXNhbXBsZS1mY20tdG9rZW4...',
    description: 'Firebase Cloud Messaging (FCM) device registration token',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

