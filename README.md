# PowerJob Console

A complete React and TypeScript console for PowerJob. Manage applications and permissions, schedules, job instances, workflow DAGs, Workers, containers and execution logs from one workspace.

## Prerelease distributions

Console 6.0.0-alpha.1 is an independent frontend prerelease, built for the existing PowerJob Server APIs. It does not imply a PowerJob Server 6 release or require a Worker/Client upgrade or database migration.

- `powerjob-console-6.0.0-alpha.1-standalone.zip`: serve `dist/` from a static host and reverse-proxy `/api/` to your Server, stripping `/api`. Preserve the Server context path in the proxy destination and support WebSocket upgrades. Serve directories with a trailing slash so relative assets also work under a static subdirectory.
- `powerjob-console-6.0.0-alpha.1-spring.zip`: `dist/` uses same-origin relative APIs. Use it as the Server's static-resource directory when packaging your own Server distribution. Back up the existing static files first and verify sign-in, scheduling, logs and container deployment in your environment.

Verify the downloaded archives against `SHA256SUMS`. Roll back by restoring the previous Console static files and API proxy configuration. The original Vue 2 source is preserved by the backup tag below.

This prerelease does not certify every Server version or authentication provider. Real third-party provider login and password-change journeys require further acceptance. PowerJob Server 5.1.6 omits nonempty servlet context paths from Worker container-JAR download URLs; use a Server at its root API path for that deployment feature. Its existing sole-application-administrator removal and exact-ID retrieval of deleted jobs are also unchanged Server behaviors.

## Development

Node.js 22.12 or newer is required. Install the locked dependencies and start the development server:

```sh
npm ci
POWERJOB_SERVER_URL=http://127.0.0.1:7700 npm run dev
```

Open `http://127.0.0.1:24800`. The development server proxies `/api` and WebSocket traffic to `POWERJOB_SERVER_URL`. The default uses a local Server. Existing `PowerJwt`, `AppId`, `NamespaceId` and Server API contracts are preserved. IDs are decoded without losing 64-bit precision.

## Build and verification

```sh
npm run lint
npm test
npm run build
npm run build_spring
```

`build_spring` produces `dist/` with relative assets and same-origin APIs. Copy this directory into your Server static-resource directory when building a Server distribution. `script/deploy.sh` builds the directory; supply a destination explicitly to copy it.

For a standalone deployment, build with an API base URL or use a reverse proxy:

```sh
VITE_API_BASE=https://scheduler.example.invalid/powerjob npm run build
```

The bundled Inter font, icons and code editor are served locally. The deployed console has no required external CDN connection. All original hash routes remain available, including workflow editor and instance-detail deep links. The interface supports Chinese and English, responsive navigation, keyboard controls and reduced motion.

## Browser regression tests

`tests/e2e/management.spec.ts` contains regression journeys for an isolated disposable Server. Configure `POWERJOB_E2E_BASE_URL`, `POWERJOB_E2E_USERNAME` and `POWERJOB_E2E_PASSWORD`, then run `npm run test:e2e`. `POWERJOB_E2E_API_PREFIX` defaults to `/api`; set it to an empty string for a Server-embedded Console. These tests create accounts and resources, change a test account password, and exercise permissions; use disposable credentials and an isolated database. Keep credentials and browser output outside version control. Browser results are separate from unit tests and builds.

## Docker

Build with `script/docker/build.sh <image-tag>`. Run the image with `POWERJOB_SERVER_URL=http://powerjob-server:7700` and publish its port 80. It serves static assets and proxies both existing HTTP and container WebSocket endpoints. This build script does not stop or delete running containers.

## Original source

The original Vue 2 console is archived in the annotated Git tag `console-legacy-before-rewrite-20261001` at `cc01554c5155779e897ad45e102649eca30c4d1b`. Check out that tag in a separate worktree to inspect or rebuild it. Switching Console source does not migrate the database or change Server, Worker or Client protocols.
