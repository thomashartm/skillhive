import type { DataSource, Repository } from 'typeorm';
import type { User, Account } from '@trainhive/db';

export interface DbEntities {
  AppDataSource: DataSource;
  User: typeof User;
  Account: typeof Account;
}

export interface UserRepository extends Repository<InstanceType<typeof User>> {}
export interface AccountRepository extends Repository<InstanceType<typeof Account>> {}
