#!/usr/bin/env ts-node
// Use compiled version to avoid decorator issues
import 'reflect-metadata';
import { AppDataSource } from '../../packages/db/dist/data-source';

async function installSchema() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connection established.');

    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('No pending migrations. Database schema is up to date.');
    } else {
      console.log(`Applied ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    }

    console.log('Schema installation completed successfully.');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error installing schema:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void installSchema();
