import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'User email for password reset',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
