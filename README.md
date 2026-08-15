### Consignes JS:

- Si probleme de version pnpm, utiliser `corepack enable pnpm` qui devrait automatiquement utiliser la bonne version
- Ne pas modifier les classes qui ont un commentaire: `// WARN: Should not be changed during the exercise
`
- Pour lancer les tests: `pnpm test`
  - integration only in watch mode `pnpm test:integration`
  - unit only in watch mode `pnpm test:unit`

## Refactoring approach

The refactoring is done following a structured, regression-safe plan. Each step is validated
against the full test suite before moving on, so behavior is preserved at every stage.

1. **◇ Characterization tests (done)** — Lock the existing behavior with deterministic integration
   tests covering every product category (NORMAL / SEASONAL / EXPIRABLE) before touching the
   implementation. Dates are controlled via fake timers so the tests are stable regardless of when
   they run.

   Tests added in `src/controllers/my-controller.integration.spec.ts`:

   - `NORMAL > decrements stock when available`
   - `NORMAL > notifies a restocking delay when out of stock`
   - `SEASONAL > decrements stock when in season and available`
   - `SEASONAL > notifies the delivery timeframe when out of stock but delivery fits within the season`
   - `SEASONAL > marks the product UNAVAILABLE when the delivery timeframe extends beyond the season end`
   - `SEASONAL > notifies out-of-stock when the season has not started yet`
   - `EXPIRABLE > decrements stock when not expired`
   - `EXPIRABLE > marks the product UNAVAILABLE once expired`

   Each scenario asserts both the resulting stock level in the database and which notification was
   (or was not) emitted.
2. **Strategy extraction** — Isolate each product category's business rules into its own
   strategy module, replacing the nested conditions in the route handler.
3. **Layer decoupling (SRP)** — Enforce strict separation: controllers only handle HTTP, services
   own business orchestration, and domain rules live in the strategies.
4. **Unit tests & wrap-up** — Add isolated unit tests for the date-boundary logic and document the
   final architecture.

Status: **Step 1 complete** — the characterization suite is in place and green
(`pnpm test` passes: 1 unit + 9 integration tests).

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