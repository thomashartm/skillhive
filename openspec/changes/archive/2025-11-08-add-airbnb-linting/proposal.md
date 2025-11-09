## Why

Consistent code quality and style across all TypeScript projects in the monorepo is essential for maintainability and developer experience. Airbnb's ESLint configuration provides a comprehensive, industry-standard set of rules that enforce best practices for TypeScript and React code.

## What Changes

- Install Airbnb ESLint configuration packages (`eslint-config-airbnb-typescript`, `eslint-config-airbnb-base`)
- Create shared ESLint configuration at root level extending Airbnb rules
- Update all TypeScript projects (apps and packages) to use the shared Airbnb configuration
- Configure Next.js apps to extend both Airbnb rules and Next.js core-web-vitals
- Ensure all packages have proper ESLint configuration files
- Add necessary ESLint plugins and dependencies
- Update lint scripts to work correctly with the new configuration

## Impact

- Affected specs: New capability `code-quality`
- Affected code: All `.eslintrc.json` files, root and workspace `package.json` files
- Migration: Existing code may need lint fixes, but no breaking changes to functionality

