import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { AppDataSource, Discipline } = await import('@trainhive/db');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const disciplineRepo = AppDataSource.getRepository(Discipline);

    // Check if already seeded
    const existingCount = await disciplineRepo.count();
    if (existingCount > 0) {
      return NextResponse.json({ message: 'Disciplines already seeded', count: existingCount });
    }

    // Seed BJJ and JKD
    const disciplines = [
      disciplineRepo.create({
        name: 'Brazilian Jiu-Jitsu',
        slug: 'bjj',
        description:
          'Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.',
      }),
      disciplineRepo.create({
        name: 'Jeet Kune Do',
        slug: 'jkd',
        description:
          'Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.',
      }),
    ];

    await disciplineRepo.save(disciplines);

    return NextResponse.json({
      message: 'Disciplines seeded successfully',
      disciplines: disciplines.map((d) => ({ id: d.id, name: d.name, slug: d.slug })),
    });
  } catch (error) {
    console.error('Error seeding disciplines:', error);
    return NextResponse.json({ error: 'Failed to seed disciplines' }, { status: 500 });
  }
}
