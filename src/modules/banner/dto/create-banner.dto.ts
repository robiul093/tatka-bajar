import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BannerLinkType } from '@prisma/client';

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Fresh Mango Festival', description: 'Banner title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Up to 30% off on Rajshahi Himsagar & Amrapali' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'SEASONAL DEAL', description: 'Promo badge tag' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ example: '#FF6B35', description: 'Badge hex color code' })
  @IsString()
  @IsOptional()
  tagColor?: string;

  @ApiProperty({
    enum: BannerLinkType,
    example: BannerLinkType.CATEGORY,
    description: 'Target redirection entity type',
  })
  @IsEnum(BannerLinkType)
  linkType: BannerLinkType;

  @ApiProperty({
    example: 'uuid-or-slug-or-keyword',
    description: 'Category ID/slug, Product ID/slug, or promotional search keyword',
  })
  @IsString()
  @IsNotEmpty()
  linkValue: string;

  @ApiPropertyOptional({ example: 25, description: 'Promotional discount percentage (0-100)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({ example: 1, default: 0, description: 'Display priority order' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;

  @ApiPropertyOptional({
    example: '2026-10-28T00:00:00.000Z',
    description: 'Scheduled display start timestamp',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    example: '2026-11-15T23:59:59.000Z',
    description: 'Scheduled display expiry timestamp',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

