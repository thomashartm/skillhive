# code-quality Specification

## Purpose
TBD - created by archiving change add-airbnb-linting. Update Purpose after archive.
## Requirements
### Requirement: Airbnb ESLint Configuration
All TypeScript projects in the monorepo SHALL use Airbnb ESLint configuration as the base linting ruleset.

#### Scenario: Root ESLint config extends Airbnb
- **WHEN** a developer checks the root `.eslintrc.json`
- **THEN** it extends `eslint-config-airbnb-typescript`
- **AND** it includes TypeScript parser configuration
- **AND** it applies to `.ts` and `.tsx` file extensions

#### Scenario: Consistent rules across workspaces
- **WHEN** a developer runs `npm run lint` at the root
- **THEN** all workspaces use the same base Airbnb rules
- **AND** linting results are consistent across apps and packages

### Requirement: Workspace-Specific ESLint Extensions
Each workspace SHALL extend the root ESLint configuration and may add workspace-specific rules.

#### Scenario: Next.js apps extend both Airbnb and Next.js rules
- **WHEN** a developer checks `.eslintrc.json` in a Next.js app
- **THEN** it extends the root config
- **AND** it extends `next/core-web-vitals`
- **AND** both rule sets are applied without conflicts

#### Scenario: Packages extend root config
- **WHEN** a developer checks `.eslintrc.json` in a package
- **THEN** it extends the root Airbnb configuration
- **AND** it applies TypeScript-specific rules correctly

### Requirement: TypeScript-Aware Linting
ESLint SHALL be configured to understand TypeScript syntax and provide TypeScript-specific linting rules.

#### Scenario: TypeScript parser configuration
- **WHEN** ESLint processes a TypeScript file
- **THEN** it uses `@typescript-eslint/parser` to parse the code
- **AND** TypeScript-specific rules from `@typescript-eslint/eslint-plugin` are applied

#### Scenario: TypeScript rule enforcement
- **WHEN** code violates TypeScript best practices (e.g., `any` type usage)
- **THEN** ESLint reports appropriate warnings or errors
- **AND** the rules align with Airbnb TypeScript style guide

### Requirement: Linting Scripts
All workspaces SHALL have lint scripts that work with the Airbnb configuration.

#### Scenario: Root lint script
- **WHEN** a developer runs `npm run lint` at the root
- **THEN** it runs linting across all workspaces
- **AND** it reports linting errors from all workspaces

#### Scenario: Workspace lint scripts
- **WHEN** a developer runs `npm run lint` in a workspace
- **THEN** it lints only that workspace's code
- **AND** it uses the workspace's ESLint configuration
- **AND** it reports errors according to Airbnb rules

