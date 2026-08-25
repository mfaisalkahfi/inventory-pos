import { IsString, IsOptional, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'inventory:read', description: 'Format: module:action' })
  @IsString()
  @Matches(/^[a-z_]+:[a-z_]+$/, {
    message: 'Slug must follow format: module:action (lowercase with underscores)',
  })
  slug: string;

  @ApiProperty({ example: 'Read Inventory' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Permission to view inventory data' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string;
}
