#!/usr/bin/env ts-node
// Use compiled version to avoid decorator issues
import { AppDataSource } from '../../packages/db/dist/data-source';
import { Category } from '../../packages/db/dist/entities/Category';
import { generateSlug } from '../../packages/shared/dist/utils/slug';
import { randomUUID } from 'crypto';

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connection established.');

    const categoryRepo = AppDataSource.getRepository(Category);

    // Default BJJ discipline ID (using a fixed UUID for BJJ)
    const bjjDisciplineId = '00000000-0000-0000-0000-000000000001';

    // Check if categories already exist to avoid overriding user data
    const existingCategories = await categoryRepo.count({ where: { disciplineId: bjjDisciplineId } });
    if (existingCategories > 0) {
      console.log(`Found ${existingCategories} existing BJJ categories. Skipping seed to preserve user data.`);
    } else {
      console.log('No existing BJJ categories found. Seeding default BJJ position categories...');

      // Create root-level BJJ position categories from proposal.md
      const categoryNames = [
        'Closing the Distance',
        'Takedown',
        'Guard',
        'Half-Guard',
        'Side Control',
        'Knee on Belly',
        'Mount',
        'Back',
      ];

      const categories = categoryNames.map((name, index) => ({
        name,
        slug: generateSlug(name),
        ord: index + 1,
      }));

      for (const cat of categories) {
        const category = categoryRepo.create({
          id: randomUUID(),
          disciplineId: bjjDisciplineId,
          name: cat.name,
          slug: cat.slug,
          ord: cat.ord,
          parentId: null,
          description: `BJJ position: ${cat.name}`,
        });
        await categoryRepo.save(category);
        console.log(`✓ Created category: ${cat.name}`);
      }

      console.log(`\n✓ Successfully seeded ${categories.length} BJJ position categories.`);
    }

    await AppDataSource.destroy();
    console.log('\nSeed script completed.');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error seeding database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void seedDatabase();

