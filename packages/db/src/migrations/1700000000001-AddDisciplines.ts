import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisciplines1700000000001 implements MigrationInterface {
  name = 'AddDisciplines1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create disciplines table
    await queryRunner.query(`
      CREATE TABLE \`disciplines\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_disciplines_name\` (\`name\`),
        UNIQUE INDEX \`IDX_disciplines_slug\` (\`slug\`)
      ) ENGINE=InnoDB
    `);

    // Seed initial disciplines
    await queryRunner.query(`
      INSERT INTO \`disciplines\` (\`id\`, \`name\`, \`slug\`, \`description\`)
      VALUES
        (1, 'Brazilian Jiu-Jitsu', 'bjj', 'Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.'),
        (2, 'Jeet Kune Do', 'jkd', 'Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.')
    `);

    // Add foreign key constraints to existing tables
    await queryRunner.query(`
      ALTER TABLE \`techniques\`
      ADD CONSTRAINT \`FK_techniques_discipline\`
      FOREIGN KEY (\`disciplineId\`) REFERENCES \`disciplines\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`categories\`
      ADD CONSTRAINT \`FK_categories_discipline\`
      FOREIGN KEY (\`disciplineId\`) REFERENCES \`disciplines\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`categories\`
      DROP FOREIGN KEY \`FK_categories_discipline\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`techniques\`
      DROP FOREIGN KEY \`FK_techniques_discipline\`
    `);

    // Drop disciplines table
    await queryRunner.query(`DROP INDEX \`IDX_disciplines_slug\` ON \`disciplines\``);
    await queryRunner.query(`DROP INDEX \`IDX_disciplines_name\` ON \`disciplines\``);
    await queryRunner.query(`DROP TABLE \`disciplines\``);
  }
}
