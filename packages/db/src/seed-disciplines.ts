import { AppDataSource } from './data-source';
import { Discipline } from './entities/Discipline';

async function seedDisciplines() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const disciplineRepo = AppDataSource.getRepository(Discipline);

    // Check if disciplines already exist
    const existingCount = await disciplineRepo.count();

    if (existingCount > 0) {
      console.log('Disciplines already seeded, skipping...');
      await AppDataSource.destroy();
      return;
    }

    // Seed BJJ and JKD
    const disciplines = [
      {
        id: 1,
        name: 'Brazilian Jiu-Jitsu',
        slug: 'bjj',
        description: 'Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.',
      },
      {
        id: 2,
        name: 'Jeet Kune Do',
        slug: 'jkd',
        description: 'Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.',
      },
    ];

    for (const disciplineData of disciplines) {
      const discipline = disciplineRepo.create(disciplineData);
      await disciplineRepo.save(discipline);
      console.log(`✓ Seeded: ${disciplineData.name} (ID: ${disciplineData.id})`);
    }

    console.log('✓ Disciplines seeded successfully!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding disciplines:', error);
    process.exit(1);
  }
}

seedDisciplines();
