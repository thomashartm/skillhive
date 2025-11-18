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
  poolSize: 20, // Maximum number of connections in the pool
  extra: {
    connectionLimit: 20, // MySQL-specific connection limit
    waitForConnections: true, // Wait for available connection instead of erroring
    queueLimit: 0, // Unlimited queue for waiting connections
    connectTimeout: 60000, // 60 seconds connection timeout
    acquireTimeout: 60000, // 60 seconds to acquire connection from pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    enableKeepAlive: true, // Keep connections alive
    keepAliveInitialDelay: 0,
  },
});
