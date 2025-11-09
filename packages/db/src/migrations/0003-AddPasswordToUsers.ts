import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordToUsers1733788800000 implements MigrationInterface {
  name = 'AddPasswordToUsers1733788800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password');
  }
}
