import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Technique } from './Technique';
import { Category } from './Category';

@Entity('technique_categories')
@Index(['techniqueId', 'categoryId'], { unique: true })
export class TechniqueCategory {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  techniqueId!: string;

  @PrimaryColumn({ type: 'varchar', length: 36 })
  categoryId!: string;

  @Column({ type: 'boolean', default: false })
  primary!: boolean;

  @ManyToOne(() => Technique, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'techniqueId' })
  technique!: Technique;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
}

