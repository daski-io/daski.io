# Release readiness

Releases are run by the release engine in the coordinator
([daski-io/deploy-mainnet](https://github.com/daski-io/deploy-mainnet)) with two
commands per target: `prep` prints exactly what the release deploys and the
wording that authorizes it, and `go` ships it. The engine only checks that CI
passed on the exact `develop` commit and deploys the image CI built
(`ghcr.io/daski-io/daski.io:<sha>`, recorded by the Release image workflow) by
digest; no service deploys from a branch. `develop` must therefore always be
releasable.

## Definition of done for develop

- CI is green on the pushed commit: the `verify` job (`npm run lint`,
  `npm test`, `npm run build`, `npm run test:runtime`) and the `handoff` job in
  `.github/workflows/verify.yml`, and the `image` job in
  `.github/workflows/release-image.yml` that builds and pushes the image, then
  scans the pushed digest with Trivy 0.67.2 (pinned by digest): a fixable
  MEDIUM-or-higher OS or Node package advisory fails it. The Dockerfile keeps
  this green by installing Debian's patched PCRE2 and Perl
  (`libpcre2-8-0=10.42-1+deb12u2`, `perl-base=5.36.0-7+deb12u4`, as the gateway
  and provider do) and by removing npm/npx from the runtime stage. When the
  scan flags the base image, refresh its digest as the Dockerfile describes.
- A new environment variable read by the site is declared in a
  `Release-Variable` trailer on the commit that introduces it (see below).
- Never push, merge or tag `sandbox` or `main` by hand. After a release is
  verified serving, the release engine fast-forwards `sandbox` (testnet) or
  `main` (production) to the released commit, as history; neither branch
  deploys anything. The testnet sandbox has been released this way since
  2026-10-04; production moves to the engine at its installation, until then
  promoted by the retained production coordinator.
- Emergency fixes branch from `main` as `hotfix/<id>`. Their pushes run the
  `verify` workflow and build their image the same way.

## Hand-off to the release agent

The release agent reads nothing but your commits. If a change needs anything at deploy time beyond its image, put it in git trailers on the commit that needs it, one per line at the end of the commit message:

```
Release-Variable: daski-website GATEWAY_INTERNAL_URL=staged before-deploy
Release-Owner-Task: Update the DNS record for the new marketing subdomain
Release-Rollback: the previous deployment serves the old value
```

- `Release-Variable`: service is `gateway`, `provider` or `daski-website`; the value is a literal or `staged`, meaning the owner sets the real value on Railway and the commit never carries a secret; the timing is `before-deploy` or `after-deploy`. A later commit overrides an earlier one for the same service and variable. A key you add to `.env.example` must appear in a `Release-Variable` trailer; write `Release-Variable: none NAME` when it needs no deployment change.
- `Release-Requires`: an environment operation the owner must authorize: `new-epoch`, `reregister:<service>` or `contract-upgrade`.
- `Release-Scenarios`: the acceptance scenarios the change touches, so the release runs them.
- `Release-Owner-Task`: work only the owner can do after the release. It is listed once in the release summary and never asked during the release.
- `Release-Rollback`: one line on how to undo the change if the release is rolled back.

Do not write runbooks or instructions for the release agent anywhere else. CI runs `scripts/check-release-trailers.mjs` over every pushed commit.
