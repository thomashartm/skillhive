import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AssetType {
  VIDEO = 'video',
  WEB = 'web',
  IMAGE = 'image',
}

export enum VideoType {
  SHORT = 'short',
  FULL = 'full',
  INSTRUCTIONAL = 'instructional',
  SEMINAR = 'seminar',
}

@Entity('reference_assets')
export class ReferenceAsset {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', nullable: true })
  techniqueId!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: false })
  type!: AssetType;

  @Column({ type: 'varchar', length: 2000, nullable: false })
  url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  videoType!: VideoType | null; // Only for video assets: short, full, instructional, seminar

  @Column({ type: 'varchar', length: 255, nullable: true })
  originator!: string | null; // Name of the person/source

  @Column({ type: 'int', default: 0 })
  ord!: number; // Display order

  @Index()
  @Column({ type: 'bigint', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
