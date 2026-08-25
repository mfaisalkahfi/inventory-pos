import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty()
  @IsUUID()
  outletId: string;

  @ApiProperty({ example: 500000, description: 'Opening cash amount' })
  @IsNumber()
  @Min(0)
  openingCash: number;
}

export class CloseSessionDto {
  @ApiProperty({ example: 1500000, description: 'Actual closing cash in register' })
  @IsNumber()
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
