import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';

export class CreateCurriculumDto {
  @ApiProperty({ example: 'BJJ Fundamentals', description: 'Curriculum title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Core techniques for BJJ beginners', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, description: 'ID of user creating this curriculum' })
  @IsNumber()
  @IsNotEmpty()
  createdBy: number;

  @ApiProperty({ example: false, description: 'Whether curriculum is publicly visible', required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
