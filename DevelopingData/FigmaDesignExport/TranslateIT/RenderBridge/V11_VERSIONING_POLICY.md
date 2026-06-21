# TranslateIT V11 Versioning Policy

## Rule

Do not change the public version label for every small patch.

During active development, keep the work under one stable development label:

```txt
V11 Design Clone Dev Build
```

Only create a new release version when the build is actually ready.

## Why

Frequent small version bumps create extra work:

- bridge mode needs updating
- plugin UI text needs updating
- audit scripts need updating
- smoke tests need updating
- documentation needs updating
- local runner scripts need updating

This slows development and makes tracking harder.

## Allowed during development

Small changes should be described as internal improvements, not public versions.

Examples:

```txt
V11 Design Clone Dev Build
- improved template intent handling
- added radius tokens
- improved UI Library grouping
- improved editable draft safety
```

## When a new version is allowed

A new release version may be created only when all of these are true:

- bridge contract is stable
- plugin renderer is stable
- UI Library is visually clean
- editable draft is usable
- audit scripts match the current output
- local smoke tests pass
- Figma visual validation passes
- the result is worth packaging as a new milestone

## Current policy

Do not introduce V11.4, V11.5, V11.6, etc. for small changes.

Keep the current development work under:

```txt
V11 Design Clone Dev Build
```

The next public version label should only be assigned after the design clone output is genuinely ready.
