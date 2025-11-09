import {
  MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex,
} from 'typeorm';

export class CreateCategoryTechniqueTables1733700000000 implements MigrationInterface {
  name = 'CreateCategoryTechniqueTables1733700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'disciplineId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'parentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ord',
            type: 'int',
            default: 0,
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

    // Create index on disciplineId
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_disciplineId',
        columnNames: ['disciplineId'],
      }),
    );

    // Create index on parentId
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_parentId',
        columnNames: ['parentId'],
      }),
    );

    // Create unique constraint on disciplineId + slug
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_disciplineId_slug',
        columnNames: ['disciplineId', 'slug'],
        isUnique: true,
      }),
    );

    // Create self-referential foreign key for parent-child relationship
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      }),
    );

    // Create techniques table
    await queryRunner.createTable(
      new Table({
        name: 'techniques',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'disciplineId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'taxonomy',
            type: 'json',
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

    // Create index on disciplineId for techniques
    await queryRunner.createIndex(
      'techniques',
      new TableIndex({
        name: 'IDX_techniques_disciplineId',
        columnNames: ['disciplineId'],
      }),
    );

    // Create technique_categories join table
    await queryRunner.createTable(
      new Table({
        name: 'technique_categories',
        columns: [
          {
            name: 'techniqueId',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'categoryId',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'primary',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    // Create unique constraint on techniqueId + categoryId
    await queryRunner.createIndex(
      'technique_categories',
      new TableIndex({
        name: 'IDX_technique_categories_techniqueId_categoryId',
        columnNames: ['techniqueId', 'categoryId'],
        isUnique: true,
      }),
    );

    // Create foreign key from technique_categories to techniques
    await queryRunner.createForeignKey(
      'technique_categories',
      new TableForeignKey({
        columnNames: ['techniqueId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'techniques',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key from technique_categories to categories
    await queryRunner.createForeignKey(
      'technique_categories',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys from technique_categories
    const techniqueCategoriesTable = await queryRunner.getTable('technique_categories');
    const techniqueFk = techniqueCategoriesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('techniqueId') !== -1);
    const categoryFk = techniqueCategoriesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('categoryId') !== -1);
    
    if (techniqueFk) {
      await queryRunner.dropForeignKey('technique_categories', techniqueFk);
    }
    if (categoryFk) {
      await queryRunner.dropForeignKey('technique_categories', categoryFk);
    }

    // Drop foreign key from categories (self-referential)
    const categoriesTable = await queryRunner.getTable('categories');
    const parentFk = categoriesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('parentId') !== -1);
    if (parentFk) {
      await queryRunner.dropForeignKey('categories', parentFk);
    }

    // Drop indexes
    await queryRunner.dropIndex('technique_categories', 'IDX_technique_categories_techniqueId_categoryId');
    await queryRunner.dropIndex('techniques', 'IDX_techniques_disciplineId');
    await queryRunner.dropIndex('categories', 'IDX_categories_disciplineId_slug');
    await queryRunner.dropIndex('categories', 'IDX_categories_parentId');
    await queryRunner.dropIndex('categories', 'IDX_categories_disciplineId');

    // Drop tables
    await queryRunner.dropTable('technique_categories');
    await queryRunner.dropTable('techniques');
    await queryRunner.dropTable('categories');
  }
}

