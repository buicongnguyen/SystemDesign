# System Design Atlas

A visual, interview-oriented guide to five related design disciplines:

- Backend and distributed systems
- Formal Systems Engineering
- Hardware and computer systems
- Embedded and cyber-physical systems
- NPU software stacks for Analog Compute-in-Memory (ACiM)

The Atlas uses flowcharts, decision maps, trade-off matrices, bottleneck catalogs, and revealable interview coaching. Its visual language matches the companion [DSA Atlas](https://buicongnguyen.github.io/Leetcode/).

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

## Deployment

- Repository: <https://github.com/buicongnguyen/SystemDesign>
- GitHub Pages: <https://buicongnguyen.github.io/SystemDesign/>

Like the companion DSA Atlas, pull requests run validation and pushes to `main` publish the static site through GitHub Actions.
