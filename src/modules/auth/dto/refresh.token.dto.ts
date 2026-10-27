import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({ example: 'uuid', description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Alias for userId' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'refresh Token' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  getTargetUserId(): string {
    return (this.userId || this.id) as string;
  }
}
