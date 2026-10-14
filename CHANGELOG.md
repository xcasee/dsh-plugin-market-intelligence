# Changelog

All notable changes to `dsh-plugin-market-intelligence` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-14

### Added

- Initial public release: a DeepSeek Harness bundle that turns the CaSee (凯见)
  intelligence corpus into a market intelligence analysis expert.
- Six model-facing tools, each with a declared canonical output schema and a
  model-facing renderer:
  - `find_trusted_sources` — discover credible sources by category/region/language/credibility
  - `search_intelligence` — Google-style keyword retrieval within a vetted source subset
  - `analyze_trend` — local daily/monthly bucketing of matching intelligence
  - `aggregate_by_source` — local per-source coverage, average credibility and samples
  - `search_with_cvc` — keyword retrieval that also files hits into a CVC vector model
  - `semantic_search` — BM25 + vector + RRF concept retrieval over a CVC model
- Expert persona registered as the `market-intelligence:expert` system-prompt
  section (order 5): analyst role, three iron rules, T-Score/ABCD grading,
  two-stage retrieval method and the dual-format output contract.
- Bundled `market-intelligence` runtime skill with reference documents:
  core workflow, search strategy, market workflow, report templates and the
  CaSee dark-dashboard HTML report style specification.
- Defensive REST normalization (field aliases folded into one canonical shape),
  client-side request pacing, per-request timeouts and structured error codes
  (`AUTH_REQUIRED`, `TIMEOUT`, `NETWORK_ERROR`, `RATE_LIMITED`, `INVALID_ARGUMENT`,
  `SERVER_ERROR`, `HTTP_ERROR`).
- Simulation test suite: an in-process mock CaSee REST service, a full
  market-intelligence pipeline over the real built plugin, positive and negative
  path assertions, and HTML/Markdown report artifact checks.

### Notes

- The plugin calls the CaSee REST surface; it is independent of the MCP endpoint
  at `causalai.me:8100`.
- `@deepseek-ai/*` runtime packages are declared as optional peers — the DSH host
  provides them — and mirrored in `devDependencies` for building.
