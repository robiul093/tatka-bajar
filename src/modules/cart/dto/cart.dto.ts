import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: 'uuid-product-id', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, default: 1, description: 'Quantity to add' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, description: 'New quantity (0 to remove item)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}
