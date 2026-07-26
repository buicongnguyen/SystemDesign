# System Design Atlas

[![Deploy GitHub Pages](https://github.com/buicongnguyen/SystemDesign/actions/workflows/pages.yml/badge.svg)](https://github.com/buicongnguyen/SystemDesign/actions/workflows/pages.yml)
[![Check external links](https://github.com/buicongnguyen/SystemDesign/actions/workflows/external-links.yml/badge.svg)](https://github.com/buicongnguyen/SystemDesign/actions/workflows/external-links.yml)

A visual, interview-oriented guide to five related design disciplines:

- Backend and distributed systems
- Formal Systems Engineering
- Hardware and computer systems
- Embedded and cyber-physical systems
- NPU software stacks for Analog Compute-in-Memory (ACiM)

The Atlas uses flowcharts, decision maps, trade-off matrices, bottleneck catalogs, worked calculations, and revealable interview coaching. Its visual language matches the companion [DSA Atlas](https://buicongnguyen.github.io/Leetcode/).

## Use it for an interview

1. Choose the page that matches the system boundary—not merely the job title.
2. Follow the page’s reasoning flow: clarify outcomes, make assumptions visible, estimate the first-order budgets, draw the critical path, choose a design, and close with failure handling and evidence.
3. Open **Interview mode** for a 45-minute timer, six thinking checkpoints, hidden coaching, and a five-part self-score.
4. Work the quantitative example before opening the coaching notes.
5. Use the bottleneck matrix to pressure-test the proposal and the evidence table to turn claims into measurable pass/fail criteria.

The worked numbers are deliberately labeled as illustrative assumptions. Recalculate them for the prompt, state the unit and measurement boundary, and distinguish average values from tail targets.

## Pages

- `index.html` — track selector, shared reasoning loop, and an integrated autonomous-drone case spanning all five tracks
- `backend.html` — scalable software and distributed systems
- `systems-engineering.html` — lifecycle, requirements, allocation, interfaces, risk, integration, statistical evidence, verification and validation
- `hardware.html` — workload-driven computer and hardware architecture
- `embedded.html` — real-time embedded and cyber-physical design, including a numerical sampled-control case
- `npu-acim.html` — analog compute-in-memory NPU compiler/runtime stack

## Local development

The site has no runtime dependencies. Development and validation require Node.js 24 or newer. Install the locked development tools first:

```sh
npm ci
```

```sh
npm run serve
```

Open <http://127.0.0.1:43129/>. To use another port, set the `PORT` environment variable before starting the server.

Build the exact public artifact:

```sh
npm run build
```

This recreates `_site/` from an explicit allowlist. Repository metadata, scripts, and workflow files are not published.

Regenerate the six route-specific 1200 × 630 social-preview cards after changing their copy or visual model:

```sh
npm run generate:social
```

Run the fast static checks:

```sh
npm run check
```

The check command syntax-checks all browser and repository scripts, runs deterministic calculation and security-boundary tests, rebuilds `_site/`, validates the source content, and confirms that the artifact contains only the intended public files with byte-for-byte matching content.

For browser smoke tests, install Chromium once and run Playwright:

```sh
npx playwright install chromium
npm run test:ui
```

The site validator checks all six pages, internal files and fragments, shared navigation, interview controls, diagram expansion, table scroll cues, route-specific preview metadata, encoded attributes, source anchors, core calculation sentinels, accessible table contracts, responsive CSS tokens, contrast, the packaged artifact, and pinned Pages workflows. A separate scheduled workflow checks external references weekly. Access-controlled, rate-limited, timeout, and transient gateway/service responses are reported as inconclusive; persistent HTTP 500, DNS, TLS, and other deterministic connection failures fail the check.

## Reference policy

Detailed sections link sources beside the decision they support. The Atlas favors standards, official implementation documentation, foundational papers, and published measurement evidence, including:

- [NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)
- [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) and [HTTP Caching, RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html)
- [Linux DMA API HOWTO](https://docs.kernel.org/core-api/dma-api-howto.html)
- [Roofline: an insightful visual performance model](https://doi.org/10.1145/1498765.1498785)
- [ONNX IR](https://onnx.ai/onnx/repo-docs/IR.html), [MLIR dialect conversion](https://mlir.llvm.org/docs/DialectConversion/), and [CiMLoop](https://github.com/mit-emze/cimloop)

Sources explain a model or contract; they do not prove a particular design meets its requirements. A real project still needs configuration-controlled assumptions, current product specifications, representative load/fault tests, calibrated measurements, and explicit acceptance criteria.

Reference availability was reviewed on 2026-07-26. Links containing `current` or `latest` intentionally follow living documentation; record the exact applicable revision and access date when using one in a design decision.

## Deployment

- Repository: <https://github.com/buicongnguyen/SystemDesign>
- GitHub Pages: <https://buicongnguyen.github.io/SystemDesign/>

Like the companion DSA Atlas, pull requests run static and browser validation, and pushes to `main` publish the allowlisted static artifact through GitHub Actions.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the evidence, accessibility, and validation expectations used for changes. Please report suspected vulnerabilities according to [SECURITY.md](SECURITY.md), not in a public issue.

## License

The repository uses separate licenses by material type:

- Source code, styles, automation, and configuration are available under the MIT License.
- Original educational prose and diagrams in the HTML pages are available under the Creative Commons Attribution 4.0 International License.

See the standard [MIT code license](LICENSE) and the [educational-content license](LICENSE-CONTENT.md) for exact scope and attribution guidance. Third-party works remain under their respective owners' terms.
