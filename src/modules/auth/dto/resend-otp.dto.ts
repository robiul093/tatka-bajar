import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum OtpType {
  VERIFICATION = 'VERIFICATION',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class ResendOtpDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: OtpType,
    default: OtpType.VERIFICATION,
    description: 'Type of OTP to resend: VERIFICATION or RESET_PASSWORD',
  })
  @IsOptional()
  @IsEnum(OtpType)
  type?: OtpType = OtpType.VERIFICATION;
}
