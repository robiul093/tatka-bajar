import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum PaymentMethodEnum {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'uuid-address-id', description: 'Saved delivery address ID' })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'If true, creates order from current shopping cart',
  })
  @IsBoolean()
  @IsOptional()
  fromCart?: boolean = true;

  @ApiPropertyOptional({
    type: [OrderItemDto],
    description: 'Specific items to order if fromCart is false',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  @ApiPropertyOptional({
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.CASH_ON_DELIVERY,
  })
  @IsEnum(PaymentMethodEnum)
  @IsOptional()
  paymentMethod?: PaymentMethodEnum = PaymentMethodEnum.CASH_ON_DELIVERY;

  @ApiPropertyOptional({
    example: 50.0,
    description: 'Delivery fee (calculated dynamically by server based on distance and free delivery threshold)',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 'Please deliver after 5 PM' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;
}

export class EstimateCheckoutDto {
  @ApiPropertyOptional({ example: 'uuid-address-id', description: 'Address ID to compute distance-based delivery fee' })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'If true, estimates for current user shopping cart',
  })
  @IsBoolean()
  @IsOptional()
  fromCart?: boolean = true;

  @ApiPropertyOptional({
    type: [OrderItemDto],
    description: 'Specific items to estimate if fromCart is false',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];
}
