import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from '@trainhive/db';

// Import auth module and guards
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ScopesGuard } from './auth/guards/scopes.guard';

// Import health module
import { HealthModule } from './health/health.module';

// Import utility modules
import { OEmbedModule } from './modules/oembed/oembed.module';

// Import all entity modules
import { UsersModule } from './modules/users/users.module';
import { DisciplinesModule } from './modules/disciplines/disciplines.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TechniquesModule } from './modules/techniques/techniques.module';
import { TagsModule } from './modules/tags/tags.module';
import { ReferenceAssetsModule } from './modules/reference-assets/reference-assets.module';
import { CurriculaModule } from './modules/curricula/curricula.module';

@Module({
  imports: [
    // Use existing TypeORM DataSource from @trainhive/db
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),
    // Authentication module
    AuthModule,
    // Health check module (public endpoints)
    HealthModule,
    // Utility modules
    OEmbedModule,
    // Entity modules
    UsersModule,
    DisciplinesModule,
    CategoriesModule,
    TechniquesModule,
    TagsModule,
    ReferenceAssetsModule,
    CurriculaModule,
  ],
  providers: [
    // Apply global authentication guard (JWT validation)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply global authorization guards (roles and scopes)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopesGuard,
    },
  ],
})
export class AppModule {}
