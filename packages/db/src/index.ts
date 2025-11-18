import 'reflect-metadata';
import 'reflect-metadata';
// Database package entry point
// Export entities, migrations, and TypeORM configuration
export { AppDataSource } from './data-source';
export { User } from './entities/User';
export { Account } from './entities/Account';
export { Discipline } from './entities/Discipline';
export { Category } from './entities/Category';
export { Technique } from './entities/Technique';
export { TechniqueCategory } from './entities/TechniqueCategory';
export { Tag } from './entities/Tag';
export { TechniqueTag } from './entities/TechniqueTag';
export { ReferenceAsset, AssetType } from './entities/ReferenceAsset';
export { ReferenceAssetTag } from './entities/ReferenceAssetTag';
export { Curriculum } from './entities/Curriculum';
export { CurriculumElement, ElementType } from './entities/CurriculumElement';
