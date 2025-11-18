#!/usr/bin/env ts-node

/**
 * Seeds the database with baseline disciplines, categories, and techniques.
 * - Uses compiled TypeORM runtime (dist) to avoid decorator issues under ts-node.
 * - Idempotent: checks for existing rows by slug before inserting.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requirements:
 *   - DATABASE_URL must point to your MySQL instance.
 */

import 'reflect-metadata';
import { AppDataSource } from '../../packages/db/dist/data-source';
import { Discipline } from '../../packages/db/dist/entities/Discipline';
import { Category } from '../../packages/db/dist/entities/Category';
import { Technique } from '../../packages/db/dist/entities/Technique';
import { TechniqueCategory } from '../../packages/db/dist/entities/TechniqueCategory';
import { User } from '../../packages/db/dist/entities/User';
import { generateSlug } from '../../packages/shared/dist/utils/slug';
import { UserRole } from '../../packages/shared/dist/types';
import bcrypt from 'bcryptjs';

type SeedDiscipline = {
  name: string;
  slug: string;
  description?: string | null;
};

type SeedCategory = {
  name: string;
  slug: string;
  description?: string | null;
  parentSlug?: string | null;
};

type SeedTechnique = {
  name: string;
  slug: string;
  description?: string | null;
  primaryCategorySlug?: string | null;
};

async function upsertDiscipline(d: SeedDiscipline) {
  const repo = AppDataSource.getRepository(Discipline);
  let row = await repo.findOne({ where: { slug: d.slug } });
  if (row) {
    // Update name/description if changed
    let changed = false;
    if (row.name !== d.name) {
      row.name = d.name;
      changed = true;
    }
    if ((row.description ?? null) !== (d.description ?? null)) {
      row.description = d.description ?? null;
      changed = true;
    }
    if (changed) {
      row = await repo.save(row);
      console.log(`✓ Updated discipline: ${d.name} (${d.slug}) id=${row.id}`);
    } else {
      console.log(`• Skipped discipline (exists): ${d.name} (${d.slug}) id=${row.id}`);
    }
    return row;
  }

  row = repo.create({
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
  });
  row = await repo.save(row);
  console.log(`✓ Created discipline: ${d.name} (${d.slug}) id=${row.id}`);
  return row;
}

async function upsertCategory(
  disciplineId: number,
  c: SeedCategory,
  slugToId: Map<string, number>
) {
  const repo = AppDataSource.getRepository(Category);

  // Resolve parent id (if provided)
  let parentId: number | null = null;
  if (c.parentSlug) {
    const parent = await repo.findOne({
      where: { disciplineId, slug: c.parentSlug },
    });
    if (!parent) {
      throw new Error(
        `Parent category with slug="${c.parentSlug}" not found for discipline=${disciplineId}`
      );
    }
    parentId = parent.id as number;
  }

  let row = await repo.findOne({ where: { disciplineId, slug: c.slug } });
  if (row) {
    let changed = false;
    if (row.name !== c.name) {
      row.name = c.name;
      changed = true;
    }
    if ((row.description ?? null) !== (c.description ?? null)) {
      row.description = c.description ?? null;
      changed = true;
    }
    if (row.parentId !== (parentId ?? null)) {
      row.parentId = parentId ?? null;
      changed = true;
    }
    if (changed) {
      row = await repo.save(row);
      console.log(`✓ Updated category: ${c.name} (${c.slug}) id=${row.id}`);
    } else {
      console.log(`• Skipped category (exists): ${c.name} (${c.slug}) id=${row.id}`);
    }
    slugToId.set(c.slug, row.id as number);
    return row;
  }

  row = repo.create({
    disciplineId,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    parentId: parentId ?? null,
    ord: 0,
    createdBy: null,
  });
  row = await repo.save(row);
  console.log(`✓ Created category: ${c.name} (${c.slug}) id=${row.id}`);
  slugToId.set(c.slug, row.id as number);
  return row;
}

async function upsertTechnique(
  disciplineId: number,
  t: SeedTechnique,
  categorySlugToId: Map<string, number>
) {
  const techRepo = AppDataSource.getRepository(Technique);
  const tcRepo = AppDataSource.getRepository(TechniqueCategory);

  let row = await techRepo.findOne({ where: { slug: t.slug, disciplineId } });
  if (!row) {
    row = techRepo.create({
      disciplineId,
      name: t.name,
      slug: t.slug,
      description: t.description ?? null,
      taxonomy: null,
      createdBy: null,
    });
    row = await techRepo.save(row);
    console.log(`✓ Created technique: ${t.name} (${t.slug}) id=${row.id}`);
  } else {
    let changed = false;
    if (row.name !== t.name) {
      row.name = t.name;
      changed = true;
    }
    if ((row.description ?? null) !== (t.description ?? null)) {
      row.description = t.description ?? null;
      changed = true;
    }
    if (changed) {
      row = await techRepo.save(row);
      console.log(`✓ Updated technique: ${t.name} (${t.slug}) id=${row.id}`);
    } else {
      console.log(`• Skipped technique (exists): ${t.name} (${t.slug}) id=${row.id}`);
    }
  }

  // Primary category association (if provided)
  if (t.primaryCategorySlug) {
    const catId = categorySlugToId.get(t.primaryCategorySlug);
    if (!catId) {
      console.warn(
        `! Technique "${t.name}" primaryCategorySlug="${t.primaryCategorySlug}" not found; skipping category association`
      );
    } else {
      const exists = await tcRepo.findOne({
        where: { techniqueId: row.id as number, categoryId: catId },
      });
      if (!exists) {
        const assoc = tcRepo.create({
          techniqueId: row.id as number,
          categoryId: catId,
          primary: true,
        });
        await tcRepo.save(assoc);
        console.log(`  ↳ Linked to category: ${t.primaryCategorySlug}`);
      } else if (!exists.primary) {
        exists.primary = true;
        await tcRepo.save(exists);
        console.log(`  ↳ Updated category link to primary: ${t.primaryCategorySlug}`);
      } else {
        console.log(`  ↳ Category link exists: ${t.primaryCategorySlug}`);
      }
    }
  }

  return row;
}

async function seed() {
  try {
    console.log('Connecting to database…');
    await AppDataSource.initialize();
    console.log('Database connected.');

    // Disciplines
    const disciplines: SeedDiscipline[] = [
      {
        name: 'Brazilian Jiu-Jitsu',
        slug: 'bjj',
        description:
          'Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.',
      },
      {
        name: 'Jeet Kune Do',
        slug: 'jkd',
        description:
          'Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.',
      },
    ];

    const savedDisciplines: Record<string, Discipline> = {};
    for (const d of disciplines) {
      const row = await upsertDiscipline(d);
      savedDisciplines[d.slug] = row;
    }

    // Categories for BJJ
    const bjjId = savedDisciplines['bjj'].id as number;
    const bjjCategoriesInput: Omit<SeedCategory, 'slug'>[] = [
      { name: 'Closing the Distance', description: 'Approach and entry to grappling range' },
      { name: 'Takedown', description: 'Standing grappling and takedowns' },
      { name: 'Guard', description: 'Guard positions and attacks' },
      { name: 'Half-Guard', description: 'Half-guard positions and transitions' },
      { name: 'Side Control', description: 'Pins and transitions from side control' },
      { name: 'Knee on Belly', description: 'Knee-on-belly pressure and transitions' },
      { name: 'Mount', description: 'Mount position attacks and escapes' },
      { name: 'Back', description: 'Back control, chokes, and maintenance' },
    ];

    // Generate slugs and upsert
    const bjjCategories: SeedCategory[] = bjjCategoriesInput.map((c) => ({
      name: c.name,
      slug: generateSlug(c.name),
      description: c.description ?? null,
    }));

    const categorySlugToId = new Map<string, number>();
    for (const c of bjjCategories) {
      await upsertCategory(bjjId, c, categorySlugToId);
    }

    // Techniques for BJJ (basic set)
    const bjjTechniquesInput: Omit<SeedTechnique, 'slug'>[] = [
      {
        name: 'Scissor Sweep',
        description: 'Basic closed guard sweep',
        primaryCategorySlug: 'guard',
      },
      {
        name: 'Hip Bump Sweep',
        description: 'Closed guard sweep using hip elevation',
        primaryCategorySlug: 'guard',
      },
      {
        name: 'Armbar from Guard',
        description: 'Armbar attack from closed guard',
        primaryCategorySlug: 'guard',
      },
      {
        name: 'Triangle Choke',
        description: 'Triangle choke from guard',
        primaryCategorySlug: 'guard',
      },
      {
        name: 'Rear Naked Choke',
        description: 'Fundamental choke from back control',
        primaryCategorySlug: 'back',
      },
      {
        name: 'Americana',
        description: 'Figure-four shoulder lock from mount/side',
        primaryCategorySlug: 'mount',
      },
      {
        name: 'Cross Collar Choke',
        description: 'Gi choke from mount',
        primaryCategorySlug: 'mount',
      },
      {
        name: 'Side Control Escape (Shrimp)',
        description: 'Hip escape to guard recovery',
        primaryCategorySlug: 'side-control',
      },
      {
        name: 'Single Leg Takedown',
        description: 'Fundamental single leg takedown',
        primaryCategorySlug: 'takedown',
      },
      {
        name: 'Double Leg Takedown',
        description: 'Fundamental double leg takedown',
        primaryCategorySlug: 'takedown',
      },
    ];

    const bjjTechniques: SeedTechnique[] = bjjTechniquesInput.map((t) => ({
      name: t.name,
      slug: generateSlug(t.name),
      description: t.description ?? null,
      primaryCategorySlug: t.primaryCategorySlug ? generateSlug(t.primaryCategorySlug) : null,
    }));

    for (const t of bjjTechniques) {
      await upsertTechnique(bjjId, t, categorySlugToId);
    }

    // Create admin user if not exists
    const userRepo = AppDataSource.getRepository(User);
    const existingUser = await userRepo.findOne({ where: { email: 'admin@skillhive.net' } });
    if (!existingUser) {
      const hashed = await bcrypt.hash('testuser', 10);
      let admin = userRepo.create({
        email: 'admin@skillhive.net',
        name: 'Admin',
        password: hashed,
        role: UserRole.ADMIN,
        handle: null,
        avatarUrl: null,
        emailVerified: null,
        lastLoginAt: null,
      });
      admin = await userRepo.save(admin);
      console.log(`✓ Created user: admin@skillhive.net (id=${admin.id})`);
    } else {
      console.log('• Skipped user (exists): admin@skillhive.net');
    }

    console.log('\n✓ Seeding completed successfully.');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('\n✗ Error during seed:', error?.message || error);
    if (error?.stack) {
      console.error(error.stack);
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void seed();
