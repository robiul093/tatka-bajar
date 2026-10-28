import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRiderDto {
  @ApiProperty({ example: 'Rakibul Hasan', description: 'Full name of the rider' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '01712345678', description: 'Unique mobile phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'rider.rakib@tatkabajar.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'Rider@1234',
    description: 'Rider account password. If omitted, default Rider@1234 will be used.',
  })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 23.7516, description: 'Initial latitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  currentLat?: number;

  @ApiPropertyOptional({ example: 90.3944, description: 'Initial longitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  currentLng?: number;
}

