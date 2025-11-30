import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curriculum } from '@trainhive/db';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Injectable()
export class CurriculaService {
  constructor(
    @InjectRepository(Curriculum)
    private curriculumRepository: Repository<Curriculum>,
  ) {}

  async create(createCurriculumDto: CreateCurriculumDto): Promise<Curriculum> {
    const curriculum = this.curriculumRepository.create(createCurriculumDto);
    return this.curriculumRepository.save(curriculum);
  }

  async findAll(createdBy?: number, isPublic?: boolean): Promise<Curriculum[]> {
    const query = this.curriculumRepository.createQueryBuilder('curriculum');

    if (createdBy !== undefined) {
      query.where('curriculum.createdBy = :createdBy', { createdBy });
    }

    if (isPublic !== undefined) {
      if (createdBy !== undefined) {
        query.orWhere('curriculum.isPublic = :isPublic', { isPublic });
      } else {
        query.where('curriculum.isPublic = :isPublic', { isPublic });
      }
    }

    return query.orderBy('curriculum.updatedAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Curriculum> {
    const curriculum = await this.curriculumRepository.findOne({ where: { id } });
    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${id} not found`);
    }
    return curriculum;
  }

  async update(id: number, updateCurriculumDto: UpdateCurriculumDto): Promise<Curriculum> {
    const curriculum = await this.findOne(id);
    Object.assign(curriculum, updateCurriculumDto);
    return this.curriculumRepository.save(curriculum);
  }

  async remove(id: number): Promise<void> {
    const curriculum = await this.findOne(id);
    await this.curriculumRepository.remove(curriculum);
  }
}
