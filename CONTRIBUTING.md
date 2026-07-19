# Contributing to System Design Atlas

Thank you for helping make the Atlas more accurate and useful for interview practice.

## Before opening a change

- Keep the distinction between backend/distributed systems, formal systems engineering, hardware architecture, embedded systems, and ACiM NPU software stacks explicit.
- Treat worked numbers as labeled assumptions. State units, workload and measurement boundaries, tail versus average targets, and the conditions under which a result applies.
- Place an authoritative source beside the claim it supports. Prefer standards, official documentation, foundational papers, and published measurements over unsourced summaries.
- Do not present a component as an automatic answer to a symptom. Explain the evidence that selects it, the failure contract, and the trade-offs.

## Accessibility and UI expectations

- Preserve one clear `h1`, logical heading order, keyboard-visible focus, and reduced-motion behavior.
- Give data tables a caption, scoped row and column headers, and a labelled focusable scroll region.
- Keep diagrams understandable without color alone and readable at narrow mobile widths.
- Encode ampersands in attribute values as `&amp;` and avoid inline event handlers.

## Local checks

Use Node.js 24 or newer and install the locked development tools:

```sh
npm ci
```

```sh
npm run check
```

This syntax-checks the scripts, rebuilds `_site/`, validates content and local links, and verifies the public artifact allowlist. Use `npm run serve` for a local preview. Run `npx playwright install chromium` once and `npm run test:ui` for browser smoke coverage. External links are checked separately with `npm run check:links`; some providers may report access-controlled or rate-limited responses as inconclusive.

## Pull requests

Keep each pull request focused. Describe the user-visible change, the evidence behind content corrections, the pages and viewport sizes reviewed, and the commands run. Do not commit `_site/`; GitHub Actions builds it for deployment.
