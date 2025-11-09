import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('accounts')
@Unique(['provider', 'providerAccountId'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  type!: string; // 'oauth' or 'oidc'

  @Index()
  @Column({ type: 'varchar', length: 50 })
  provider!: string; // 'google' or 'facebook'

  @Index()
  @Column({ type: 'varchar', length: 255 })
  providerAccountId!: string; // OIDC provider's account ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshToken!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accessToken!: string | null;

  @Column({ type: 'int', nullable: true })
  expiresAt!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tokenType!: string | null;

  @Column({ type: 'text', nullable: true })
  scope!: string | null;

  @Column({ type: 'text', nullable: true })
  idToken!: string | null;

  @Column({ type: 'text', nullable: true })
  sessionState!: string | null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, global-require
  @ManyToOne(
    () => require('./User').User,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'userId' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user!: any;

  @Column({ type: 'uuid' })
  userId!: string;
}
