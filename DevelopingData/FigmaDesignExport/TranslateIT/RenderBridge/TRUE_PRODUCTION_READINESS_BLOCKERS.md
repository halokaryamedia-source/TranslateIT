# TranslateIT True Production Readiness Blockers

Current honest status:

```txt
NOT READY FOR FIGMA TEST
```

The project must not be presented as ready until all blockers below are resolved.

## Blocker 1 — External Visual UI Parser Missing

Required because DOM alone is not enough.

Acceptable options:

- OmniParser service integration
- UIED CLI integration
- Custom OpenCV UI segmentation with real tests

Required report:

```txt
reports/translateit-external-engine-readiness.json
visual-ui-parser = ready
```

## Blocker 2 — Layout Intent Engine Missing

Required to classify:

- Header
- Hero
- Content Cards
- Footer
- CTA
- Media Groups

Without this, the output is just guessed layout.

## Blocker 3 — Auto Layout Renderer Not Proven

Required because raw absolute Figma layers are not useful.

The renderer must output:

```txt
Header
Hero
Content Cards
Footer
Design Tokens
```

as framework/component-like sections.

## Blocker 4 — Preview Compare Must Be Reviewed Before Figma

Before manual Figma test, the audit must show:

- framework output preview
- source screenshot reference below
- layer tree summary
- usability score
- export package preview

## Blocker 5 — HTML Export Package Must Validate

The export must include:

- index.html
- styles.css
- assets/images
- design-blueprint.json
- manifest.json

## Required Rule

Do not test Figma if this file exists and these blockers are unresolved.

The next allowed status is:

```txt
PREVIEW REVIEWABLE
```

Only after preview is accepted:

```txt
FIGMA TEST ALLOWED
```
