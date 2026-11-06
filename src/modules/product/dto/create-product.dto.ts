import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ProductUnitEnum {
  KG = 'KG',
  GRAM = 'GRAM',
  PIECE = 'PIECE',
  LITER = 'LITER',
  PACKET = 'PACKET',
  DOZEN = 'DOZEN',
  BUNDLE = 'BUNDLE',
  BOX = 'BOX',
}

// Helpers for multipart/form-data transformation (empty string -> undefined)
const toOptionalString = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const toOptionalNumber = ({ value }: { value: any }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? value : num;
};

const toOptionalBoolean = ({ value }: { value: any }) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (value === 'true' || value === true || value === 1 || value === '1') return true;
  if (value === 'false' || value === false || value === 0 || value === '0') return false;
  return value;
};

export class CreateProductDto {
  @ApiProperty({ example: 'uuid-category-id', description: 'Category ID' })
  @Transform(toOptionalString)
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Fresh Deshi Tomato', description: 'Product title' })
  @Transform(toOptionalString)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fresh-deshi-tomato', description: 'Slug (auto-generated if omitted)' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Naturally ripened, fresh red deshi tomatoes from local farmers' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Up to 8 product image files (JPEG, PNG, WEBP, max 5MB each)',
  })
  @IsOptional()
  images?: any;

  @ApiPropertyOptional({ enum: ProductUnitEnum, default: ProductUnitEnum.KG })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ProductUnitEnum)
  @IsOptional()
  unit?: ProductUnitEnum;

  @ApiPropertyOptional({ example: 1.0, default: 1.0 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitValue?: number;

  @ApiPropertyOptional({ example: 45.0, description: 'Purchase/buy price (admin cost)' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  @IsOptional()
  buyPrice?: number;

  @ApiProperty({ example: 60.0, description: 'Selling price per unit' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Discounted sell price (used when isDiscount is true)' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  discountPrice?: number | null;

  @ApiPropertyOptional({ example: 15, description: 'Discount percentage (1-99). If provided, discountPrice is auto-calculated' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(1)
  @Max(99)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: true, default: false, description: 'Toggle discount on/off' })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isDiscount?: boolean;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 'Karwan Bazar, Dhaka', description: 'Product origin/location' })
  @Transform(toOptionalString)
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 24.3636, description: 'Origin/farm latitude coordinate' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsOptional()
  originLat?: number;

  @ApiPropertyOptional({ example: 88.6241, description: 'Origin/farm longitude coordinate' })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsOptional()
  originLng?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isOrganic?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isSeasonal?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
