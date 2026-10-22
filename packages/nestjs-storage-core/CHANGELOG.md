# @miinded/nestjs-storage-core

## 2.0.0

### Major Changes

- 3841ce6: Require Node.js >= 24 and refresh dependencies for security fixes.

  - `engines.node` is now `>=24` (Node.js 22 is no longer supported).
  - `@miinded/nestjs-s3`: AWS SDK packages raised to `^3.1156.0` (pulls a patched `fast-xml-parser`).
  - Dependencies updated to their latest compatible versions.

## 1.0.1

### Patch Changes

- 4ccd657: fix: add NPM publishing support and CI improvements

## 1.0.0

### Major Changes

- Add core package with shared types and security fixes. Implement StorageAdapter interface, dual builds, and path traversal protection.
