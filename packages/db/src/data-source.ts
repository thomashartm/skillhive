import { DataSource } from 'typeorm';
import path from 'path';
import { User } from './entities/User';
import { Category } from './entities/Category';
import { Technique } from './entities/Technique';
import { TechniqueCategory } from './entities/TechniqueCategory';
// Account entity is optional for now - can be added back when needed for OAuth
// import { Account } from './entities/Account';

export const AppDataSource = new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL || 'mysql://trainhive_user:trainhive_password@localhost:3306/trainhive',
  synchronize: false, // Use migrations instead
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Category, Technique, TechniqueCategory], // Core entities
  migrations: [path.join(__dirname, 'migrations/**/*.{ts,js}')],
  migrationsTableName: 'migrations',
  extra: {
    connectionLimit: 10,
  },
});
