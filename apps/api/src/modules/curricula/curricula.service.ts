import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Curriculum, CurriculumElement, Technique, ReferenceAsset } from '@trainhive/db';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CreateCurriculumElementDto } from './dto/create-curriculum-element.dto';
import { UpdateCurriculumElementDto } from './dto/update-curriculum-element.dto';
import { ReorderElementsDto } from './dto/reorder-elements.dto';

@Injectable()
export class CurriculaService {
  constructor(
    @InjectRepository(Curriculum)
    private curriculumRepository: Repository<Curriculum>,
    @InjectRepository(CurriculumElement)
    private elementRepository: Repository<CurriculumElement>,
    @InjectRepository(Technique)
    private techniqueRepository: Repository<Technique>,
    @InjectRepository(ReferenceAsset)
    private assetRepository: Repository<ReferenceAsset>,
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

  // ============================================================================
  // Curriculum Element Methods
  // ============================================================================

  async addElement(
    curriculumId: number,
    createElementDto: CreateCurriculumElementDto,
  ): Promise<CurriculumElement> {
    // Verify curriculum exists
    await this.findOne(curriculumId);

    // Validate element type matches provided IDs
    if (createElementDto.type === 'technique' && !createElementDto.techniqueId) {
      throw new BadRequestException('techniqueId is required for technique elements');
    }
    if (createElementDto.type === 'asset' && !createElementDto.assetId) {
      throw new BadRequestException('assetId is required for asset elements');
    }
    if (createElementDto.type === 'text' && !createElementDto.title) {
      throw new BadRequestException('title is required for text elements');
    }

    // Get the maximum ord value for this curriculum
    const maxOrdResult = await this.elementRepository
      .createQueryBuilder('element')
      .select('MAX(element.ord)', 'maxOrd')
      .where('element.curriculumId = :curriculumId', { curriculumId })
      .getRawOne();

    const nextOrd = (maxOrdResult?.maxOrd ?? -1) + 1;

    // Create element with next ord value
    const element = this.elementRepository.create({
      ...createElementDto,
      curriculumId,
      ord: nextOrd,
    });

    return this.elementRepository.save(element);
  }

  async listElements(curriculumId: number): Promise<any[]> {
    // Verify curriculum exists
    await this.findOne(curriculumId);

    const elements = await this.elementRepository.find({
      where: { curriculumId },
      order: { ord: 'ASC' },
    });

    // Collect unique technique and asset IDs (convert to numbers to handle bigint columns)
    const techniqueIds = elements
      .filter(e => e.techniqueId !== null)
      .map(e => Number(e.techniqueId));
    const assetIds = elements
      .filter(e => e.assetId !== null)
      .map(e => Number(e.assetId));

    // Fetch techniques and assets in bulk
    const techniques = techniqueIds.length > 0
      ? await this.techniqueRepository.find({ where: { id: In(techniqueIds) } })
      : [];
    const assets = assetIds.length > 0
      ? await this.assetRepository.find({ where: { id: In(assetIds) } })
      : [];

    // Create maps for quick lookup
    const techniqueMap = new Map(techniques.map(t => [t.id, t]));
    const assetMap = new Map(assets.map(a => [a.id, a]));

    // Attach technique and asset data to elements (convert IDs to numbers for Map lookup)
    return elements.map(element => ({
      ...element,
      technique: element.techniqueId ? techniqueMap.get(Number(element.techniqueId)) || null : null,
      asset: element.assetId ? assetMap.get(Number(element.assetId)) || null : null,
    }));
  }

  async updateElement(
    curriculumId: number,
    elementId: number,
    updateElementDto: UpdateCurriculumElementDto,
  ): Promise<CurriculumElement> {
    const element = await this.elementRepository.findOne({
      where: { id: elementId, curriculumId },
    });

    if (!element) {
      throw new NotFoundException(
        `Element with ID ${elementId} not found in curriculum ${curriculumId}`,
      );
    }

    Object.assign(element, updateElementDto);
    return this.elementRepository.save(element);
  }

  async removeElement(curriculumId: number, elementId: number): Promise<void> {
    const element = await this.elementRepository.findOne({
      where: { id: elementId, curriculumId },
    });

    if (!element) {
      throw new NotFoundException(
        `Element with ID ${elementId} not found in curriculum ${curriculumId}`,
      );
    }

    await this.elementRepository.remove(element);
  }

  async reorderElements(
    curriculumId: number,
    reorderDto: ReorderElementsDto,
  ): Promise<CurriculumElement[]> {
    // Verify curriculum exists
    await this.findOne(curriculumId);

    // Get all elements for this curriculum
    const elements = await this.elementRepository.find({
      where: { curriculumId },
    });

    // Validate that all provided IDs belong to this curriculum
    const elementIds = elements.map((e) => e.id);
    const invalidIds = reorderDto.elementIds.filter((id) => !elementIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Element IDs ${invalidIds.join(', ')} do not belong to curriculum ${curriculumId}`,
      );
    }

    // Update ord values based on the new order
    const updates = reorderDto.elementIds.map((id, index) => {
      const element = elements.find((e) => e.id === id);
      if (element) {
        element.ord = index;
      }
      return element;
    });

    // Save all updates
    await this.elementRepository.save(updates.filter((e) => e !== undefined));

    // Return updated elements in order
    return this.elementRepository.find({
      where: { curriculumId },
      order: { ord: 'ASC' },
    });
  }
}
