import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Fresh Vegetables', description: 'Name of the category' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fresh-vegetables', description: 'URL slug (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: '🥦', description: 'Category emoji icon' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ example: 'Locally grown farm fresh organic vegetables delivered daily' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/vegetables.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order (lower = higher priority)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
