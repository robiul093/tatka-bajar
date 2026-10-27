import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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
import { Type } from 'class-transformer';

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

export class CreateProductDto {
  @ApiProperty({ example: 'uuid-category-id', description: 'Category ID' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Fresh Deshi Tomato', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fresh-deshi-tomato', description: 'Slug (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Naturally ripened, fresh red deshi tomatoes from local farmers' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/demo/image/upload/tomato1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ enum: ProductUnitEnum, default: ProductUnitEnum.KG })
  @IsEnum(ProductUnitEnum)
  @IsOptional()
  unit?: ProductUnitEnum;

  @ApiPropertyOptional({ example: 1.0, default: 1.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitValue?: number;

  @ApiPropertyOptional({ example: 45.0, description: 'Purchase/buy price (admin cost)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  buyPrice?: number;

  @ApiProperty({ example: 60.0, description: 'Selling price per unit' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Discounted sell price (used when isDiscount is true)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  discountPrice?: number | null;

  @ApiPropertyOptional({ example: 15, description: 'Discount percentage (1-99). If provided, discountPrice is auto-calculated' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(99)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: true, default: false, description: 'Toggle discount on/off' })
  @IsBoolean()
  @IsOptional()
  isDiscount?: boolean;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 'Karwan Bazar, Dhaka', description: 'Product origin/location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isOrganic?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isSeasonal?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
