import { AppDataSource } from './src/data-source';

async function resetDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    const queryRunner = AppDataSource.createQueryRunner();

    // Disable foreign key checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');

    // Drop tables
    const tables = ['technique_categories', 'techniques', 'categories', 'accounts', 'users', 'migrations'];
    for (const table of tables) {
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.log(`Table ${table} does not exist or could not be dropped`);
      }
    }

    // Re-enable foreign key checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('Database reset complete. TypeORM will auto-create schema on next connection.');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
