import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home', default: 'Home', description: 'Label for the address' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'John Doe', description: 'Recipient name' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ example: '01712345678', description: 'Recipient phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'House 12, Road 4, Sector 7', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @ApiPropertyOptional({ example: 'Uttara' })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({ example: 'Dhaka', default: 'Dhaka' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '1230' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 23.8103, description: 'Latitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 90.4125, description: 'Longitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ default: false, description: 'Set as default delivery address' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
