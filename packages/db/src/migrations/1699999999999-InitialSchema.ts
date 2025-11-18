import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699999999999 implements MigrationInterface {
  name = 'InitialSchema1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`handle\` varchar(255) NULL,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`role\` enum('user', 'admin', 'manager', 'professor') NOT NULL DEFAULT 'user',
        \`avatarUrl\` varchar(500) NULL,
        \`emailVerified\` datetime NULL,
        \`lastLoginAt\` datetime NULL,
        \`password\` varchar(255) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_EMAIL\` (\`email\`)
      ) ENGINE=InnoDB
    `);

    // Create accounts table (for OAuth)
    await queryRunner.query(`
      CREATE TABLE \`accounts\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`type\` varchar(255) NOT NULL,
        \`provider\` varchar(50) NOT NULL,
        \`providerAccountId\` varchar(255) NOT NULL,
        \`refreshToken\` varchar(255) NULL,
        \`accessToken\` varchar(255) NULL,
        \`expiresAt\` int NULL,
        \`tokenType\` varchar(50) NULL,
        \`scope\` text NULL,
        \`idToken\` text NULL,
        \`sessionState\` text NULL,
        \`userId\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_PROVIDER_ACCOUNT\` (\`provider\`, \`providerAccountId\`),
        INDEX \`IDX_USER_ID\` (\`userId\`),
        CONSTRAINT \`FK_ACCOUNT_USER\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`disciplineId\` bigint NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`parentId\` bigint NULL,
        \`description\` text NULL,
        \`ord\` int NOT NULL DEFAULT 0,
        \`createdBy\` bigint NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_DISCIPLINE_SLUG\` (\`disciplineId\`, \`slug\`),
        INDEX \`IDX_DISCIPLINE\` (\`disciplineId\`),
        INDEX \`IDX_PARENT\` (\`parentId\`),
        INDEX \`IDX_CREATED_BY\` (\`createdBy\`),
        CONSTRAINT \`FK_CATEGORY_PARENT\` FOREIGN KEY (\`parentId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create techniques table
    await queryRunner.query(`
      CREATE TABLE \`techniques\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`disciplineId\` bigint NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`taxonomy\` json NULL,
        \`createdBy\` bigint NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_TECHNIQUE_DISCIPLINE\` (\`disciplineId\`),
        INDEX \`IDX_CREATED_BY\` (\`createdBy\`)
      ) ENGINE=InnoDB
    `);

    // Create technique_categories junction table
    await queryRunner.query(`
      CREATE TABLE \`technique_categories\` (
        \`techniqueId\` bigint NOT NULL,
        \`categoryId\` bigint NOT NULL,
        \`primary\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`techniqueId\`, \`categoryId\`),
        UNIQUE INDEX \`IDX_TECHNIQUE_CATEGORY\` (\`techniqueId\`, \`categoryId\`),
        CONSTRAINT \`FK_TC_TECHNIQUE\` FOREIGN KEY (\`techniqueId\`) REFERENCES \`techniques\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_TC_CATEGORY\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create tags table
    await queryRunner.query(`
      CREATE TABLE \`tags\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`disciplineId\` bigint NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`color\` varchar(7) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_TAG_DISCIPLINE_SLUG\` (\`disciplineId\`, \`slug\`),
        INDEX \`IDX_TAG_DISCIPLINE\` (\`disciplineId\`)
      ) ENGINE=InnoDB
    `);

    // Create technique_tags junction table
    await queryRunner.query(`
      CREATE TABLE \`technique_tags\` (
        \`techniqueId\` bigint NOT NULL,
        \`tagId\` bigint NOT NULL,
        PRIMARY KEY (\`techniqueId\`, \`tagId\`),
        UNIQUE INDEX \`IDX_TECHNIQUE_TAG\` (\`techniqueId\`, \`tagId\`),
        CONSTRAINT \`FK_TT_TECHNIQUE\` FOREIGN KEY (\`techniqueId\`) REFERENCES \`techniques\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_TT_TAG\` FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create reference_assets table
    await queryRunner.query(`
      CREATE TABLE \`reference_assets\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`techniqueId\` bigint NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`url\` varchar(2000) NOT NULL,
        \`title\` varchar(255) NULL,
        \`description\` text NULL,
        \`videoType\` varchar(50) NULL,
        \`originator\` varchar(255) NULL,
        \`ord\` int NOT NULL DEFAULT 0,
        \`createdBy\` bigint NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_ASSET_TECHNIQUE\` (\`techniqueId\`),
        INDEX \`IDX_CREATED_BY\` (\`createdBy\`),
        CONSTRAINT \`FK_ASSET_TECHNIQUE\` FOREIGN KEY (\`techniqueId\`) REFERENCES \`techniques\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create reference_asset_tags junction table
    await queryRunner.query(`
      CREATE TABLE \`reference_asset_tags\` (
        \`assetId\` bigint NOT NULL,
        \`tagId\` bigint NOT NULL,
        PRIMARY KEY (\`assetId\`, \`tagId\`),
        UNIQUE INDEX \`IDX_ASSET_TAG\` (\`assetId\`, \`tagId\`),
        CONSTRAINT \`FK_AT_ASSET\` FOREIGN KEY (\`assetId\`) REFERENCES \`reference_assets\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_AT_TAG\` FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`reference_asset_tags\``);
    await queryRunner.query(`DROP TABLE \`reference_assets\``);
    await queryRunner.query(`DROP TABLE \`technique_tags\``);
    await queryRunner.query(`DROP TABLE \`tags\``);
    await queryRunner.query(`DROP TABLE \`technique_categories\``);
    await queryRunner.query(`DROP TABLE \`techniques\``);
    await queryRunner.query(`DROP TABLE \`categories\``);
    await queryRunner.query(`DROP TABLE \`accounts\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
