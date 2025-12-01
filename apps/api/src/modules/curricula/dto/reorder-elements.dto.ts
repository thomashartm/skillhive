import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class ReorderElementsDto {
  @ApiProperty({
    example: [3, 1, 2],
    description: 'Ordered array of element IDs defining the new order',
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  elementIds: number[];
}
