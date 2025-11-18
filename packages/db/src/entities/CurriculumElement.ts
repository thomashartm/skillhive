import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ElementType {
  TECHNIQUE = 'technique',
  ASSET = 'asset',
  TEXT = 'text',
}

@Entity('curriculum_elements')
export class CurriculumElement {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', nullable: false })
  curriculumId!: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  type!: ElementType;

  @Column({ type: 'int', default: 0 })
  ord!: number; // Display order

  @Column({ type: 'bigint', nullable: true })
  techniqueId!: number | null;

  @Column({ type: 'bigint', nullable: true })
  assetId!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null; // For text elements

  @Column({ type: 'text', nullable: true })
  details!: string | null; // Additional notes/details for any element type

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
