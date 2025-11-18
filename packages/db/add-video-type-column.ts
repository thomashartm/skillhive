import { AppDataSource } from './src/data-source';

async function addVideoTypeColumn() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    const queryRunner = AppDataSource.createQueryRunner();

    try {
      // Check if column already exists
      const columnExists = await queryRunner.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reference_assets'
        AND COLUMN_NAME = 'videoType'
      `);

      if (columnExists.length === 0) {
        console.log('Adding videoType column to reference_assets table...');
        await queryRunner.query(`
          ALTER TABLE \`reference_assets\`
          ADD COLUMN \`videoType\` varchar(50) NULL AFTER \`description\`
        `);
        console.log('✓ videoType column added successfully!');
      } else {
        console.log('✓ videoType column already exists');
      }
    } catch (error) {
      console.error('Error adding column:', error);
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addVideoTypeColumn();
