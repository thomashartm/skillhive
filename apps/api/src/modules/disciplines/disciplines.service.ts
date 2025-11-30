import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from '@trainhive/db';
import { generateSlug } from '@trainhive/shared';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private disciplineRepository: Repository<Discipline>,
  ) {}

  async create(createDisciplineDto: CreateDisciplineDto): Promise<Discipline> {
    const slug = createDisciplineDto.slug || generateSlug(createDisciplineDto.name);

    // Check for duplicate slug
    const existing = await this.disciplineRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Discipline with slug '${slug}' already exists`);
    }

    const discipline = this.disciplineRepository.create({
      ...createDisciplineDto,
      slug,
    });

    return this.disciplineRepository.save(discipline);
  }

  async findAll(): Promise<Discipline[]> {
    return this.disciplineRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Discipline> {
    const discipline = await this.disciplineRepository.findOne({ where: { id } });
    if (!discipline) {
      throw new NotFoundException(`Discipline with ID ${id} not found`);
    }
    return discipline;
  }

  async findBySlug(slug: string): Promise<Discipline> {
    const discipline = await this.disciplineRepository.findOne({ where: { slug } });
    if (!discipline) {
      throw new NotFoundException(`Discipline with slug '${slug}' not found`);
    }
    return discipline;
  }

  async update(id: number, updateDisciplineDto: UpdateDisciplineDto): Promise<Discipline> {
    const discipline = await this.findOne(id);

    if (updateDisciplineDto.slug && updateDisciplineDto.slug !== discipline.slug) {
      const existing = await this.disciplineRepository.findOne({
        where: { slug: updateDisciplineDto.slug }
      });
      if (existing) {
        throw new ConflictException(`Discipline with slug '${updateDisciplineDto.slug}' already exists`);
      }
    }

    Object.assign(discipline, updateDisciplineDto);
    return this.disciplineRepository.save(discipline);
  }

  async remove(id: number): Promise<void> {
    const discipline = await this.findOne(id);
    await this.disciplineRepository.remove(discipline);
  }
}
