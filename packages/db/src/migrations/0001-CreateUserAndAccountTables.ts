import {
  MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex,
} from 'typeorm';

export class CreateUserAndAccountTables1733600000000 implements MigrationInterface {
  name = 'CreateUserAndAccountTables1733600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'handle',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['user', 'admin', 'manager', 'professor'],
            default: "'user'",
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'emailVerified',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on email
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );

    // Create accounts table
    await queryRunner.createTable(
      new Table({
        name: 'accounts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'providerAccountId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'accessToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'tokenType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'scope',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'idToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sessionState',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create unique constraint on provider + providerAccountId
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_provider_providerAccountId',
        columnNames: ['provider', 'providerAccountId'],
        isUnique: true,
      }),
    );

    // Create index on providerAccountId
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_providerAccountId',
        columnNames: ['providerAccountId'],
      }),
    );

    // Create index on provider
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_provider',
        columnNames: ['provider'],
      }),
    );

    // Create foreign key from accounts to users
    await queryRunner.createForeignKey(
      'accounts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const accountsTable = await queryRunner.getTable('accounts');
    const foreignKey = accountsTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('accounts', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('accounts', 'IDX_accounts_provider');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_providerAccountId');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_provider_providerAccountId');
    await queryRunner.dropIndex('users', 'IDX_users_email');

    // Drop tables
    await queryRunner.dropTable('accounts');
    await queryRunner.dropTable('users');
  }
}
