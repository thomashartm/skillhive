import { DataSource } from 'typeorm';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL || 'mysql://trainhive_user:trainhive_password@localhost:3306/trainhive',
  synchronize: false, // Use migrations instead
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, 'src/entities/**/*.ts')],
  migrations: [path.join(__dirname, 'src/migrations/**/*.ts')],
  migrationsTableName: 'migrations',
  extra: {
    connectionLimit: 10,
  },
});
