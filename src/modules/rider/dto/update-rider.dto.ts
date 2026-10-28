import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRiderDto {
  @ApiPropertyOptional({ example: 'Rakibul Hasan Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '01799887766' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: true, description: 'Active status of the rider' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;
}

