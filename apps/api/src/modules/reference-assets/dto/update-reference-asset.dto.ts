import { PartialType } from '@nestjs/swagger';
import { CreateReferenceAssetDto } from './create-reference-asset.dto';

export class UpdateReferenceAssetDto extends PartialType(CreateReferenceAssetDto) {}
