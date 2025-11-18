import {
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm';

@Entity('reference_asset_tags')
@Index(['assetId', 'tagId'], { unique: true })
export class ReferenceAssetTag {
  @PrimaryColumn({ type: 'bigint' })
  assetId!: number;

  @PrimaryColumn({ type: 'bigint' })
  tagId!: number;
}
