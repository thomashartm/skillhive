import { AppDataSource } from './src/data-source';

async function checkSchema() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    const queryRunner = AppDataSource.createQueryRunner();

    try {
      // Check reference_assets table structure
      const columns = await queryRunner.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reference_assets'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('\n=== reference_assets table structure ===');
      columns.forEach((col: any) => {
        console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ' (nullable)' : ''}`);
      });

      // Check if videoType column exists
      const videoTypeColumn = columns.find((col: any) => col.COLUMN_NAME === 'videoType');
      if (videoTypeColumn) {
        console.log('\n✓ videoType column exists!');
        console.log(`  Type: ${videoTypeColumn.DATA_TYPE}`);
        console.log(`  Nullable: ${videoTypeColumn.IS_NULLABLE}`);
      } else {
        console.log('\n✗ videoType column NOT found');
      }
    } catch (error) {
      console.error('Error checking schema:', error);
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
