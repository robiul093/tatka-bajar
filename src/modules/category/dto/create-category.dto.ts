import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toOptionalString = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const toOptionalInt = ({ value }: { value: any }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? value : Math.round(num);
};

const toOptionalBoolean = ({ value }: { value: any }) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (value === 'true' || value === true || value === 1 || value === '1') return true;
  if (value === 'false' || value === false || value === 0 || value === '0') return false;
  return value;
};

export class CreateCategoryDto {
  @ApiProperty({ example: 'Fresh Vegetables', description: 'Name of the category' })
  @Transform(toOptionalString)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fresh-vegetables', description: 'URL slug (auto-generated if omitted)' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: '🥦', description: 'Category emoji icon' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ example: 'Locally grown farm fresh organic vegetables delivered daily' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Category cover or icon image file (JPEG, PNG, WEBP, max 5MB)',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({ default: 0, description: 'Display order (lower = higher priority)' })
  @Transform(toOptionalInt)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
