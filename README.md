# System Design Atlas

A visual, interview-oriented guide to five related design disciplines:

- Backend and distributed systems
- Formal Systems Engineering
- Hardware and computer systems
- Embedded and cyber-physical systems
- NPU software stacks for Analog Compute-in-Memory (ACiM)

The Atlas uses flowcharts, decision maps, trade-off matrices, bottleneck catalogs, and revealable interview coaching. Its visual language matches the companion [DSA Atlas](https://buicongnguyen.github.io/Leetcode/).

## Use it for an interview

1. Choose the page that matches the system boundary—not merely the job title.
2. Follow the page’s reasoning flow: clarify outcomes, make assumptions visible, estimate the first-order budgets, draw the critical path, choose a design, and close with failure handling and evidence.
3. Work the quantitative example before opening the coaching notes.
4. Use the bottleneck matrix to pressure-test the proposal and the evidence table to turn claims into measurable pass/fail criteria.

The worked numbers are deliberately labeled as illustrative assumptions. Recalculate them for the prompt, state the unit and measurement boundary, and distinguish average values from tail targets.

## Pages

- `index.html` — track selector and shared reasoning loop
- `backend.html` — scalable software and distributed systems
- `systems-engineering.html` — lifecycle, requirements, allocation, interfaces, risk, integration, verification and validation
- `hardware.html` — workload-driven computer and hardware architecture
- `embedded.html` — real-time embedded and cyber-physical design
- `npu-acim.html` — analog compute-in-memory NPU compiler/runtime stack

## Validate

```sh
npm run check
```

The repository includes a GitHub Pages workflow that validates the site before deployment.

The validator checks all six pages, internal files and fragments, shared navigation, source anchors, core calculation sentinels, accessible table contracts, responsive CSS tokens, contrast, and the Pages workflow.

## Reference policy

Detailed sections link sources beside the decision they support. The Atlas favors standards, official implementation documentation, foundational papers, and published measurement evidence, including:

- [NASA Systems Engineering Handbook](https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf)
- [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) and [HTTP Caching, RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html)
- [Linux DMA API HOWTO](https://docs.kernel.org/core-api/dma-api-howto.html)
- [Roofline: an insightful visual performance model](https://doi.org/10.1145/1498765.1498785)
- [ONNX IR](https://onnx.ai/onnx/repo-docs/IR.html), [MLIR dialect conversion](https://mlir.llvm.org/docs/DialectConversion/), and [CiMLoop](https://github.com/mit-emze/cimloop)

Sources explain a model or contract; they do not prove a particular design meets its requirements. A real project still needs configuration-controlled assumptions, current product specifications, representative load/fault tests, calibrated measurements, and explicit acceptance criteria.

## Deployment

- Repository: <https://github.com/buicongnguyen/SystemDesign>
- GitHub Pages: <https://buicongnguyen.github.io/SystemDesign/>

Like the companion DSA Atlas, pull requests run validation and pushes to `main` publish the static site through GitHub Actions.
