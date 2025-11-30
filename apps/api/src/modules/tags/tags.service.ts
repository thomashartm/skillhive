import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '@trainhive/db';
import { generateSlug } from '@trainhive/shared';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const slug = createTagDto.slug || generateSlug(createTagDto.name);

    // Check for duplicate slug within discipline
    const existing = await this.tagRepository.findOne({
      where: { disciplineId: createTagDto.disciplineId, slug },
    });
    if (existing) {
      throw new ConflictException(`Tag with slug '${slug}' already exists in this discipline`);
    }

    const tag = this.tagRepository.create({
      ...createTagDto,
      slug,
    });

    return this.tagRepository.save(tag);
  }

  async findAll(disciplineId?: number): Promise<Tag[]> {
    const query = this.tagRepository.createQueryBuilder('tag');

    if (disciplineId) {
      query.where('tag.disciplineId = :disciplineId', { disciplineId });
    }

    return query.orderBy('tag.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    // Check for slug uniqueness if changing
    if (updateTagDto.slug && updateTagDto.slug !== tag.slug) {
      const disciplineId = updateTagDto.disciplineId || tag.disciplineId;
      const existing = await this.tagRepository.findOne({
        where: { disciplineId, slug: updateTagDto.slug }
      });
      if (existing) {
        throw new ConflictException(`Tag with slug '${updateTagDto.slug}' already exists in this discipline`);
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }
}
