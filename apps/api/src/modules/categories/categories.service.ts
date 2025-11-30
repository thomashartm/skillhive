import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '@trainhive/db';
import { generateSlug } from '@trainhive/shared';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const slug = createCategoryDto.slug || generateSlug(createCategoryDto.name);

    // Check for duplicate slug within discipline
    const existing = await this.categoryRepository.findOne({
      where: { disciplineId: createCategoryDto.disciplineId, slug },
    });
    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists in this discipline`);
    }

    // Validate parent exists if provided
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found`);
      }
      // Ensure parent is in same discipline
      if (parent.disciplineId !== createCategoryDto.disciplineId) {
        throw new BadRequestException('Parent category must be in the same discipline');
      }
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(disciplineId?: number): Promise<Category[]> {
    const query = this.categoryRepository.createQueryBuilder('category');

    if (disciplineId) {
      query.where('category.disciplineId = :disciplineId', { disciplineId });
    }

    return query.orderBy('category.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    // Check for slug uniqueness if changing
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const disciplineId = updateCategoryDto.disciplineId || category.disciplineId;
      const existing = await this.categoryRepository.findOne({
        where: { disciplineId, slug: updateCategoryDto.slug }
      });
      if (existing) {
        throw new ConflictException(`Category with slug '${updateCategoryDto.slug}' already exists in this discipline`);
      }
    }

    // Prevent self-reference
    if (updateCategoryDto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    // Validate parent if changing
    if (updateCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${updateCategoryDto.parentId} not found`);
      }
      const disciplineId = updateCategoryDto.disciplineId || category.disciplineId;
      if (parent.disciplineId !== disciplineId) {
        throw new BadRequestException('Parent category must be in the same discipline');
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}
