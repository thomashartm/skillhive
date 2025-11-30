import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateDisciplineDto {
  @ApiProperty({ example: 'Brazilian Jiu-Jitsu', description: 'Name of the discipline' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'brazilian-jiu-jitsu', description: 'URL-friendly slug', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ example: 'A martial art focusing on grappling and ground fighting', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
