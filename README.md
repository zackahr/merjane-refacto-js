### Consignes JS:

- Si probleme de version pnpm, utiliser `corepack enable pnpm` qui devrait automatiquement utiliser la bonne version
- Ne pas modifier les classes qui ont un commentaire: `// WARN: Should not be changed during the exercise
`
- Pour lancer les tests: `pnpm test`
  - integration only in watch mode `pnpm test:integration`
  - unit only in watch mode `pnpm test:unit`

## Known build & setup issues

Below are the issues encountered during setup/build and how to resolve them.

### 1. Peer dependency conflicts (npm)

When installing with `npm`, you may hit peer dependency conflicts between `fastify` 4.25.2 and its
community plugins (`@fastify/awilix`, `fastify-type-provider-zod`, etc.) which require a newer
`fastify` major. Use the legacy peer resolution to install successfully:

```bash
npm install --legacy-peer-deps
```

This project is managed with pnpm by default (`pnpm install`), which does not hit this issue.

### 2. better-sqlite3 native build failure

`better-sqlite3` ships native bindings. The history of issues:

- On Node.js v26 (current default), `better-sqlite3@12.6.2` has no prebuilt binary and failed to
  compile, producing:

  ```
  Could not locate the bindings file. Tried: .../build/Release/better_sqlite3.node
  Error: The module '.../better_sqlite3.node' failed to load. ERR_DLOPEN_FAILED
  ```

  **Fix:** upgraded `better-sqlite3` to `^13.0.3`, which supports newer Node versions (engines
  `node >= 22`) and compiles cleanly. Run `pnpm install` (or `npm install --legacy-peer-deps`)
  after upgrading so the native binding is rebuilt for your Node version.

- If the binding ever fails with `ERR_DLOPEN_FAILED` again after changing your Node version,
  rebuild it with:
  ```bash
  pnpm rebuild better-sqlite3
  ```