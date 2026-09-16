# Release readiness

Releases are run by the deploy-testnet coordinator
([daski-io/deploy-testnet](https://github.com/daski-io/deploy-testnet)) with two
commands: `prep` makes the next release green, fixing whatever blocks it in the
owning repository, and `go` ships it. The coordinator only checks that CI passed
on the exact `develop` commit and promotes the image CI built
(`ghcr.io/daski-io/daski.io:<sha>`, recorded by the Release image workflow), so
`develop` must always be releasable.

## Definition of done for develop

- CI is green on the pushed commit: the `verify` job (`npm run lint`,
  `npm test`, `npm run build`, `npm run test:runtime`) and the `handoff` job in
  `.github/workflows/verify.yml`, and the `image` job in
  `.github/workflows/release-image.yml` that builds and pushes the image.
- A new environment variable read by the site is declared in a
  `Release-Variable` trailer on the commit that introduces it (see below).
- Never merge to `main` or tag by hand. The coordinator does that through its
  authorized `go`, and only for a commit CI proved.

## Hand-off to the release agent

The release agent reads nothing but your commits. If a change needs anything at deploy time beyond merging, put it in git trailers on the commit that needs it, one per line at the end of the commit message:

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
