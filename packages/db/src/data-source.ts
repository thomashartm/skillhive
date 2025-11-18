import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Discipline } from './entities/Discipline';
import { Category } from './entities/Category';
import { Technique } from './entities/Technique';
import { TechniqueCategory } from './entities/TechniqueCategory';
import { Account } from './entities/Account';
import { Tag } from './entities/Tag';
import { TechniqueTag } from './entities/TechniqueTag';
import { ReferenceAsset } from './entities/ReferenceAsset';
import { ReferenceAssetTag } from './entities/ReferenceAssetTag';
import { Curriculum } from './entities/Curriculum';
import { CurriculumElement } from './entities/CurriculumElement';

export const AppDataSource = new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL || 'mysql://trainhive_user:trainhive_password@localhost:3306/trainhive',
  synchronize: true, // Auto-create schema from entities (dev only)
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Discipline,
    Category,
    Technique,
    TechniqueCategory,
    Account,
    Tag,
    TechniqueTag,
    ReferenceAsset,
    ReferenceAssetTag,
    Curriculum,
    CurriculumElement,
  ],
  extra: {
    connectionLimit: 10,
  },
});
