import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRiderLocationDto {
  @ApiProperty({ example: 23.7516, description: 'Current latitude (-90 to 90)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  currentLat: number;

  @ApiProperty({ example: 90.3944, description: 'Current longitude (-180 to 180)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  currentLng: number;
}

