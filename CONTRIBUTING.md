# Contributing

Contributions are welcome! This guide will help you get up and running on the project.

## Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | `>= 20` |
| pnpm    | `>= 10` |

> **Tip:** the exact pnpm version is pinned via `packageManager` in the root `package.json`. Corepack will pick it up automatically if enabled (`corepack enable`).

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/miinded/nestjs-storage.git
cd nestjs-storage

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run unit tests to verify everything works
pnpm test:unit
```

## Monorepo structure

This project is a **pnpm workspace** orchestrated by [Turborepo](https://turbo.build/).

```
.
├── packages/
│   ├── nestjs-s3/              # @miinded/nestjs-s3 — S3-compatible storage adapter
│   │   └── src/
│   │       ├── common/         # Decorator, utils, types, error mapper
│   │       ├── service/        # S3Service implementation
│   │       ├── s3.module.ts    # NestJS dynamic module
│   │       └── index.ts        # Public barrel export
│   └── nestjs-google-drive/    # @miinded/nestjs-google-drive — Google Drive adapter
│       └── src/                # Same layout as nestjs-s3
├── config/                     # Shared Jest presets, barrel checker, dependency policy
├── scripts/                    # CI helper scripts
├── turbo.json                  # Turborepo task pipeline
├── pnpm-workspace.yaml         # Workspace & dependency catalog
└── package.json                # Root scripts & devDependencies
```

Each package follows the same internal layout:

| Directory / File | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `common/`        | Decorator (`@InjectS3`, …), utils, types, error mapper      |
| `service/`       | Core service implementation                                 |
| `*.module.ts`    | NestJS `register` / `registerAsync` dynamic module          |
| `index.ts`       | Public API barrel — verified by `api-contract.unit.spec.ts` |

## Development workflow

### Typical cycle

```bash
# 1. Make your changes inside packages/<package>/src/

# 2. Run unit tests for the package you changed
pnpm test:unit

# 3. Lint & format
pnpm lint
pnpm format:check

# 4. Build to ensure compilation succeeds
pnpm build

# 5. Full CI quality check (recommended before opening a PR)
pnpm ci:quality
```

### Available scripts

| Script               | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `pnpm build`         | Build all packages (via Turbo)                         |
| `pnpm test:unit`     | Run unit tests (`*.unit.spec.ts`)                      |
| `pnpm test:int`      | Run integration tests (`*.int.spec.ts`)                |
| `pnpm test:e2e`      | Run end-to-end tests (`*.e2e.spec.ts`)                 |
| `pnpm test:coverage` | Run tests with coverage report                         |
| `pnpm lint`          | Lint all packages                                      |
| `pnpm format`        | Format all files with Prettier                         |
| `pnpm format:check`  | Check formatting without writing                       |
| `pnpm deps:check`    | Verify dependency policy across packages               |
| `pnpm barrels:check` | Verify barrel (`index.ts`) exports are consistent      |
| `pnpm ci:quality`    | Full CI pipeline: deps + barrels + lint + test + build |

## Test conventions

Tests are separated by type with dedicated Jest configs (see `config/jest-presets.mjs`):

| Type        | File pattern     | Command          |
| ----------- | ---------------- | ---------------- |
| Unit        | `*.unit.spec.ts` | `pnpm test:unit` |
| Integration | `*.int.spec.ts`  | `pnpm test:int`  |
| E2E         | `*.e2e.spec.ts`  | `pnpm test:e2e`  |

- **Unit tests** must stay fast and isolated — mock all external dependencies.
- **API contract tests** (`api-contract.unit.spec.ts`) verify exported runtime keys to catch accidental breaking changes.
- Coverage thresholds are enforced: 80 % statements, 75 % branches, 80 % functions, 80 % lines.

## Git hooks

[Husky](https://typicode.github.io/husky/) runs the following hooks automatically:

| Hook         | Action                                                    |
| ------------ | --------------------------------------------------------- |
| `pre-commit` | `lint-staged` — formats staged files with Prettier        |
| `commit-msg` | `commitlint` — validates Conventional Commits format      |
| `pre-push`   | `deps:check` + `test:unit` — prevents pushing broken code |

## Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Common prefixes:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `test:` — adding or updating tests
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `chore:` — maintenance (deps, CI, tooling)

## Pull request checklist

- [ ] Changes are scoped and focused on a single concern
- [ ] New or updated tests cover the changes
- [ ] `pnpm ci:quality` passes locally
- [ ] Commit messages follow Conventional Commits
- [ ] A [changeset](https://github.com/changesets/changesets) is added if the change affects the public API (`pnpm changeset`)
