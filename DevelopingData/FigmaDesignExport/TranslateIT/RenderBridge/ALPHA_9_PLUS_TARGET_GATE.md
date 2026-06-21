# TranslateIT Version 0.1 - Alpha 9+ Target Gate

## Current honest target

```txt
Current Alpha score: around 7.3 / 10
Near-term pre-Figma target: 7.5 / 10
9+ target: only after repeated Figma visual validation and fixes
```

## What 9+ means

A 9+ Design Clone result means:

- screenshot reference is clean and untouched
- rebuild plan is useful for a real designer
- UI Library looks like a professional design-system page
- editable draft is visually coherent without manual cleanup first
- spacing hierarchy feels intentional
- typography hierarchy feels intentional
- section templates do not look generic
- long content does not overlap
- generated result can be used as a real Figma starting point
- multiple websites produce stable results

## Alpha pre-test gate

Before Figma testing, all of these should pass:

```txt
run-alpha-professional-preflight.ps1
```

This checks:

- bridge syntax
- plugin syntax
- smoke contract
- static code contract
- semantic blueprint contract
- quality gate
- pre-test gate
- UI Library polish audit
- template safety audit
- semantic HTML preview generation

## Minimum before first serious Figma validation

```txt
Expected score: 7.5 / 10
```

Required before claiming 7.5:

- Alpha professional preflight passes
- semantic preview is readable
- no contract mismatch
- no missing priorityText/contentBudget/componentBlueprints
- no public V11.x label leaks

## Required after Figma validation to approach 9+

- inspect imported Figma canvas
- screenshot frame must be pure
- UI Library must look clean when zoomed out
- editable draft must not feel like raw blocks
- fix any overlap or bad hierarchy
- test at least 3 different websites
- compare output against screenshot visually
- repeat fix cycle

## Do not claim 9+ if

- only local HTML preview has passed
- Figma import has not been visually reviewed
- only one website has been checked
- layout still feels generic
- UI Library is technically complete but visually weak
