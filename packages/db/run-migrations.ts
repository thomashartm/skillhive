import { AppDataSource } from './src/data-source';

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    // eslint-disable-next-line no-console
    console.log('Database connection initialized');

    const migrations = await AppDataSource.runMigrations();
    // eslint-disable-next-line no-console
    console.log(`Ran ${migrations.length} migration(s)`);

    migrations.forEach((migration) => {
      // eslint-disable-next-line no-console
      console.log(`  - ${migration.name}`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to run migrations:', error);
  process.exit(1);
});
