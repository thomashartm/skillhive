import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoTypeToReferenceAssets1700000000000 implements MigrationInterface {
  name = 'AddVideoTypeToReferenceAssets1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add videoType column to reference_assets table
    await queryRunner.query(`
      ALTER TABLE \`reference_assets\`
      ADD COLUMN \`videoType\` varchar(50) NULL AFTER \`description\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove videoType column from reference_assets table
    await queryRunner.query(`
      ALTER TABLE \`reference_assets\`
      DROP COLUMN \`videoType\`
    `);
  }
}
