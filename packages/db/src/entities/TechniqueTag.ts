import {
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm';

@Entity('technique_tags')
@Index(['techniqueId', 'tagId'], { unique: true })
export class TechniqueTag {
  @PrimaryColumn({ type: 'bigint' })
  techniqueId!: number;

  @PrimaryColumn({ type: 'bigint' })
  tagId!: number;
}
