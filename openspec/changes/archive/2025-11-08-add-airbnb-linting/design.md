## Context

The monorepo currently has inconsistent ESLint configurations:
- Root level uses basic `eslint:recommended`
- Next.js apps extend `next/core-web-vitals` only
- Packages have lint scripts but may lack proper ESLint configs
- No unified code style enforcement across workspaces

Airbnb's ESLint configuration is widely adopted and provides:
- Comprehensive TypeScript support
- React best practices
- Modern JavaScript/TypeScript patterns
- Accessibility considerations

## Goals / Non-Goals

### Goals
- Unified linting rules across all TypeScript projects
- Airbnb style guide compliance
- TypeScript-aware linting rules
- React-specific best practices for Next.js apps
- Consistent developer experience across workspaces

### Non-Goals
- Changing existing code style (lint fixes can be done incrementally)
- Adding Prettier integration (already configured separately)
- Custom rule creation (use Airbnb defaults)
- Different rules per workspace (consistency is key)

## Decisions

### Decision: Use `eslint-config-airbnb-typescript` for TypeScript projects
**Rationale**: 
- Provides TypeScript-aware versions of Airbnb rules
- Works seamlessly with `@typescript-eslint/parser`
- Widely used and well-maintained
- Supports both `.ts` and `.tsx` files

**Alternatives considered**:
- **Manual rule configuration**: Too much maintenance overhead
- **Other style guides (Standard, Google)**: Airbnb is more comprehensive for React/TypeScript

### Decision: Shared base config at root, workspace-specific extends
**Rationale**:
- Single source of truth for linting rules
- Workspaces can extend base config and add app-specific rules (e.g., Next.js)
- Easier to maintain and update rules
- Follows monorepo best practices

**Structure**:
```
.eslintrc.json (root) - Base Airbnb TypeScript config
apps/*/.eslintrc.json - Extends root + Next.js rules
packages/*/.eslintrc.json - Extends root config
```

### Decision: Keep Next.js core-web-vitals for Next.js apps
**Rationale**:
- Next.js provides important performance and accessibility rules
- Complements Airbnb rules without conflict
- Standard practice for Next.js projects

### Decision: Install dependencies at root level
**Rationale**:
- Shared ESLint configs should be in root `node_modules`
- Reduces duplication across workspaces
- Easier dependency management

## Risks / Trade-offs

### Risk: Existing code may have many lint errors
**Mitigation**: Run lint with `--fix` flag initially, document remaining issues, fix incrementally

### Risk: Airbnb rules may be too strict for some use cases
**Mitigation**: Can disable specific rules per workspace if needed, but prefer fixing code to disabling rules

### Risk: Build time increase from stricter linting
**Mitigation**: Linting runs in CI/CD, not blocking local development. Can use `--max-warnings` if needed during transition.

## Migration Plan

1. Install dependencies at root
2. Create shared base ESLint config
3. Update workspace ESLint configs to extend base
4. Run lint across all workspaces to identify issues
5. Fix auto-fixable issues
6. Document remaining manual fixes needed
7. Update CI/CD to enforce linting

## Open Questions

- Should we enforce linting in pre-commit hooks?
  - **Decision**: Not in scope for this change, can be added later
- Should we add lint-staged for incremental linting?
  - **Decision**: Not in scope, can be added later if needed

