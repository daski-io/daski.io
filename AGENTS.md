---
title: daski.io agent instructions
status: canonical
authority: repository implementation and current release-engine decisions
owner: repository maintainers
effective-date: 2026-10-16
last-verified: 2026-10-16
supersedes: earlier local-path or split-coordinator guidance where inconsistent
superseded-by: none
sensitivity: public-safe
related-repositories: daski-io/daski.io; see interface owners below
review-trigger: architecture, toolchain, interface or release-process change
---

# Website and MCP contributor guide

Owns the Astro website, public `/mcp` endpoint, buyer agent guides in `src/skills/`
and discovery surfaces. Read README, `docs/release-readiness.md` and the current
implementation/tests. Gateway owns REST and order/payment state; the website consumes
it. The website does not own buyer wallets or duplicate transaction state.

## Implementation and content

- Coordinate MCP, discovery and guide changes with the gateway REST contract and
  buyer capabilities/exact CLI pin. Never blindly retry transaction requests.
- Coordinate promotion displays with the promotions private API. Keep its internal
  API and payout/customer details out of public surfaces.
- Official brand, artwork, terms and business claims require current owner-approved
  sources. In the shared workspace follow its connected-Drive freshness procedure;
  in a standalone checkout obtain the approved source before dependent edits.
  A design draft or old chat is not evidence of approved claims.
- Update tests and buyer-facing instructions with behavior. Keep private design
  transcripts, audits and strategy out of public commits.
- Verify rendered behavior and live-data assumptions at the appropriate stage;
  an HTTP success code alone does not prove a correct release.

## Local checks

Use the current README/Docker/CI Node requirement (>=22.12, Node 22 runtime), install
from the lockfile for the current host, then run `npm run lint`, `npm test`,
`npm run build` and `npm run test:runtime` as required by the readiness guide.
Build/runtime checks use controlled configuration. Publishing the site requires the
engine's release authority; a content edit or green build is not publication.

## Shared work and release boundary

These instructions apply to every agent and contributor. `AGENTS.md` is canonical;
`CLAUDE.md` only imports it. Read this guide, README, relevant nested instructions,
Git status, package/toolchain files and CI before editing. If working from a shared
Daski workspace, explicitly read its root guide, repository map and development
workflow too; a standalone clone must remain usable without private workspace paths.

Use one task branch/worktree and one writer per checkout. Preserve other work.
Identify affected sibling repositories, interface consumers and tests before changing
a shared contract. Keep durable implementation knowledge in tracked docs and private
operational material in its owning private system, not in assistant memory.

Work targets `develop` or a reviewed branch into it. Integration is distinct from
release. The release engine in [daski-io/deploy-mainnet](https://github.com/daski-io/deploy-mainnet)
owns **both sandbox and production**. Read its current `AGENTS.md`,
`docs/release-map.md`, `docs/runbooks/release-engine.md` and handoff schema before an
operation. Never substitute a direct `main`/`sandbox` push or merge, Railway deploy,
package publication or contract broadcast for that process. Even engine `prep` can
sign a catalog epoch or propose a Safe batch; it is not an unsigned local check.
A build request does not authorize release, paid tests, signing or business actions.
Use existing owner authorization within its scope and honor the engine's actual stops.

Keep secrets, customer data, private audits and raw operational logs out of commits.
Never add AI attribution or co-author trailers to commits or pull requests.
