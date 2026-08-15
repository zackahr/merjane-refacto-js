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
2. **◇ Strategy extraction (done)** — Each product category's business rules now live in its own
   strategy module under `src/strategies/` (`NormalProductStrategy`, `SeasonalProductStrategy`,
   `ExpirableProductStrategy`). They are pure decision logic (a product + a reference date in, an
   action out), replacing the nested conditions that were embedded in the route handler. The
   `ProductService` now owns the order-processing orchestration, and the controller only handles
   HTTP (parse, delegate, reply).

   - `src/strategies/product.strategy.ts` — `ProductStrategy` contract, `StrategyAction` results and factory
   - `src/strategies/normal-product-strategy.ts`
   - `src/strategies/seasonal-product-strategy.ts`
   - `src/strategies/expirable-product-strategy.ts`
3. **◇ Layer decoupling (SRP) (done)** — Strict separation is enforced and verified across the
   three layers: controllers only parse/validate HTTP and reply, services own business
   orchestration and persistence, strategies hold the domain rules. Magic values are centralized in
   `src/constants/inventory.ts` (product types and time constants), and the `products.type` column
   is typed against the `ProductType` union so invalid values are caught at compile time.
4. **◇ Unit tests & wrap-up (done)** — Isolated unit tests exercise the date-boundary logic of the
   extracted strategies without any database or infrastructure:

   - `src/strategies/normal-product-strategy.spec.ts` (decrement / delay / none)
   - `src/strategies/seasonal-product-strategy.spec.ts` (exact season-start and season-end
     boundaries, delivery past season end, delivery within season, season not started)
   - `src/strategies/expirable-product-strategy.spec.ts` (exact expiry-date boundary, sale before
     expiry regardless of stock after expiry)

Status: **All steps complete** — 14 unit + 9 integration tests green, business rules isolated in
strategies, strict SRP layering enforced with centralized constants.

## Final architecture

The inventory tracking flow follows a strict three-layer separation:

```text
HTTP request
    │
    ▼
Controller (HTTP only)          src/controllers/my-controller.ts
    │  validates params + replies {orderId}
    ▼
ProductService (orchestration)  src/services/impl/product.service.ts
    │  loads the order, drives the strategy per product,
    │  persists stock and emits notifications
    ▼
Product strategies (domain)     src/strategies/*-product-strategy.ts
    │  pure decisions: product + reference date → action
    │  (decrement / delay / out-of-stock / unavailable / expired / none)
    ▼
INotificationService (port)     src/services/notifications.port.ts (unchanged)
```

- **Controller** strictly handles HTTP request parsing/validation and response formatting.
- **Service** owns business orchestration, persistence and side effects (notifications).
- **Strategies** encapsulate category-specific rules as pure functions with an explicit reference
  date, eliminating nested conditionals.
- **Constants** (`src/constants/inventory.ts`) centralize product types and time magic values.

Regression safety was guaranteed by characterization tests written *before* any source change:
they lock the existing behavior (stock levels + emitted notifications for every product category),
so the refactor kept the endpoint contract and scenarios identical throughout.

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