# PowerJob Console

A complete React and TypeScript console for PowerJob. Manage applications and permissions, schedules, job instances, workflow DAGs, Workers, containers and execution logs from one workspace.

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

`tests/e2e/management.spec.ts` contains regression journeys for an isolated disposable Server. Configure `POWERJOB_E2E_BASE_URL`, `POWERJOB_E2E_CREDENTIALS` and `POWERJOB_E2E_SERVER_URL`, then run `npm run test:e2e`. Credential files and browser output must stay outside version control. Browser results are separate from unit tests and builds.

## Docker

Build with `script/docker/build.sh <image-tag>`. Run the image with `POWERJOB_SERVER_URL=http://powerjob-server:7700` and publish its port 80. It serves static assets and proxies both existing HTTP and container WebSocket endpoints. This build script does not stop or delete running containers.

## Original source

The original Vue 2 console is archived in the annotated Git tag `console-legacy-before-rewrite-20261001` at `cc01554c5155779e897ad45e102649eca30c4d1b`. Check out that tag in a separate worktree to inspect or rebuild it. Switching Console source does not migrate the database or change Server, Worker or Client protocols.
