import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technique, TechniqueCategory } from '@trainhive/db';
import { generateSlug } from '@trainhive/shared';
import { CreateTechniqueDto } from './dto/create-technique.dto';
import { UpdateTechniqueDto } from './dto/update-technique.dto';

@Injectable()
export class TechniquesService {
  constructor(
    @InjectRepository(Technique)
    private techniqueRepository: Repository<Technique>,
    @InjectRepository(TechniqueCategory)
    private techniqueCategoryRepository: Repository<TechniqueCategory>,
  ) {}

  async create(createTechniqueDto: CreateTechniqueDto): Promise<Technique> {
    const slug = createTechniqueDto.slug || generateSlug(createTechniqueDto.name);

    // Check for duplicate slug within discipline
    const existing = await this.techniqueRepository.findOne({
      where: { disciplineId: createTechniqueDto.disciplineId, slug },
    });
    if (existing) {
      throw new ConflictException(`Technique with slug '${slug}' already exists in this discipline`);
    }

    const technique = this.techniqueRepository.create({
      disciplineId: createTechniqueDto.disciplineId,
      name: createTechniqueDto.name,
      slug,
      description: createTechniqueDto.description || null,
    });

    const savedTechnique = await this.techniqueRepository.save(technique);

    // Associate categories if provided
    if (createTechniqueDto.categoryIds && createTechniqueDto.categoryIds.length > 0) {
      await this.associateCategories(savedTechnique.id, createTechniqueDto.categoryIds);
    }

    return savedTechnique;
  }

  async findAll(disciplineId?: number): Promise<Technique[]> {
    const query = this.techniqueRepository.createQueryBuilder('technique');

    if (disciplineId) {
      query.where('technique.disciplineId = :disciplineId', { disciplineId });
    }

    return query.orderBy('technique.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Technique> {
    const technique = await this.techniqueRepository.findOne({ where: { id } });
    if (!technique) {
      throw new NotFoundException(`Technique with ID ${id} not found`);
    }
    return technique;
  }

  async update(id: number, updateTechniqueDto: UpdateTechniqueDto): Promise<Technique> {
    const technique = await this.findOne(id);

    // Check for slug uniqueness if changing
    if (updateTechniqueDto.slug && updateTechniqueDto.slug !== technique.slug) {
      const disciplineId = updateTechniqueDto.disciplineId || technique.disciplineId;
      const existing = await this.techniqueRepository.findOne({
        where: { disciplineId, slug: updateTechniqueDto.slug }
      });
      if (existing) {
        throw new ConflictException(`Technique with slug '${updateTechniqueDto.slug}' already exists in this discipline`);
      }
    }

    Object.assign(technique, {
      disciplineId: updateTechniqueDto.disciplineId,
      name: updateTechniqueDto.name,
      slug: updateTechniqueDto.slug,
      description: updateTechniqueDto.description,
    });

    const savedTechnique = await this.techniqueRepository.save(technique);

    // Update category associations if provided
    if (updateTechniqueDto.categoryIds !== undefined) {
      await this.techniqueCategoryRepository.delete({ techniqueId: id });
      if (updateTechniqueDto.categoryIds.length > 0) {
        await this.associateCategories(id, updateTechniqueDto.categoryIds);
      }
    }

    return savedTechnique;
  }

  async remove(id: number): Promise<void> {
    const technique = await this.findOne(id);
    await this.techniqueRepository.remove(technique);
  }

  private async associateCategories(techniqueId: number, categoryIds: number[]): Promise<void> {
    const associations = categoryIds.map((categoryId, index) => ({
      techniqueId,
      categoryId,
      isPrimary: index === 0, // First category is primary
    }));

    await this.techniqueCategoryRepository.save(associations);
  }
}
