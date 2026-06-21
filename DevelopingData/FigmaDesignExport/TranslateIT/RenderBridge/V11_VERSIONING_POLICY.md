# TranslateIT Versioning Policy

## Current public version

```txt
Version 0.1 - Alpha
```

This version label is locked during active development.

Do not change the public version label for every small patch.

## Rule

All current Design Clone development must stay under:

```txt
Version 0.1 - Alpha
```

Do not introduce labels like:

```txt
V11.4
V11.5
V11.6
0.1.1
0.1.2
0.1.3
```

Small improvements should be treated as internal Alpha improvements, not public version changes.

## Why

Frequent version bumps create extra work:

- bridge mode needs updating
- plugin UI text needs updating
- audit scripts need updating
- smoke tests need updating
- documentation needs updating
- local runner scripts need updating

This slows development and makes tracking harder.

## Allowed during Alpha development

Small changes should be described as internal improvements under the same version.

Example:

```txt
Version 0.1 - Alpha
- improved template intent handling
- added radius tokens
- improved UI Library grouping
- improved editable draft safety
- improved audit honesty
```

## When a new version is allowed

A new public version may be created only when all of these are true:

- bridge contract is stable
- plugin renderer is stable
- UI Library is visually clean
- editable draft is usable
- audit scripts match the current output
- local smoke tests pass
- Figma visual validation passes
- the result is worth packaging as a new milestone

## Current policy

Keep the current development work under:

```txt
Version 0.1 - Alpha
```

The next public version label should only be assigned after the design clone output is genuinely ready.
