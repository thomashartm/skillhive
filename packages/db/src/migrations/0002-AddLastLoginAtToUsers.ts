import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLastLoginAtToUsers1733700000000 implements MigrationInterface {
  name = 'AddLastLoginAtToUsers1733700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastLoginAt',
        type: 'datetime',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'lastLoginAt');
  }
}
