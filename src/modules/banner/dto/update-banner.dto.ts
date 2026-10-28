import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BannerLinkType } from '@prisma/client';

export class UpdateBannerDto {
  @ApiPropertyOptional({ example: 'Winter Fresh Vegetables' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Farm-fresh cauliflower, cabbage & carrots' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'DAILY SPECIAL' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ example: '#2E7D32' })
  @IsString()
  @IsOptional()
  tagColor?: string;

  @ApiPropertyOptional({ enum: BannerLinkType, example: BannerLinkType.CATEGORY })
  @IsEnum(BannerLinkType)
  @IsOptional()
  linkType?: BannerLinkType;

  @ApiPropertyOptional({ example: 'vegetables' })
  @IsString()
  @IsOptional()
  linkValue?: string;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: '2026-10-28T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

