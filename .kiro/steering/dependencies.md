---
inclusion: always
---

# Dependency Management Guidelines

## GitHub Actions

Always use the latest major versions for GitHub Actions. Use the `@v{major}` syntax to automatically get the latest minor and patch versions within that major version.

Examples:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `pnpm/action-setup@v4`

## Package Manager

This project uses pnpm as the package manager. The version is specified in package.json under the `packageManager` field.

Current version: `pnpm@10.30.3`

When setting up CI/CD workflows or providing installation instructions:
- Always reference the pnpm version from package.json
- Use `packageManager` field value for consistency
- In GitHub Actions, use `pnpm/action-setup` which automatically reads the version from package.json

## Version Updates

- Keep GitHub Actions on latest major versions
- Update pnpm version in package.json `packageManager` field when needed
- Ensure all workflows and documentation reference the package.json version
