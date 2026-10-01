# PowerJob Console

PowerJob Console `5.1.6_fev3-rc.1` is a standalone administration UI for PowerJob Server 5.1.6. This edition is rebuilt in Vue 3 and TypeScript with native controls, a compact workspace, a workflow canvas, and shared scheduling tools.

The Server version is the release prefix. `fev3` identifies this frontend generation. Installing this Console does not upgrade Server, Worker, or Client, or replace the Console bundled in the Server JAR.

## Use the standalone distribution

Download the versioned ZIP and SHA-256 file from [Console releases](https://github.com/PowerJob/PowerJob-Console/releases). Verify the checksum, extract the archive, and serve its `dist/` directory through your web server. Keep the previous distribution and its API configuration for rollback.

The default API base is the directory hosting the Console. Proxy the existing Server HTTP endpoints and `/container/deploy/` WebSocket connections through that directory, or edit `dist/config.js` before serving:

```js
window.POWERJOB_CONFIG = {
  apiBaseUrl: 'https://powerjob.example.invalid/server'
};
```

For a Console deployed at `/console/` with an API proxy at `/api/`, use `apiBaseUrl: '/api'`. Static resources and fonts support a subdirectory. Hash routes preserve job history, workflow definitions, and workflow instance links. A cross-origin API needs the existing Server/proxy CORS configuration. An HTTPS page needs an HTTPS API and secure WebSocket endpoint.

Reverse-proxy requests retain the existing `PowerJwt`, `AppId`, and `NamespaceId` headers. No new authentication protocol or session affinity is introduced. Rollback consists of restoring the previous static distribution and its `config.js`; there is no database migration.

## Development

Use Node.js 24 and the checked-in lockfile:

```sh
npm ci
npm run dev
npm run check
npm run package
```

The development server listens on `127.0.0.1:5173`. Its `/api` proxy targets the default local Server at `http://127.0.0.1:7700`. Set `POWERJOB_DEV_API_TARGET` to use another development Server; Vite's `--port` option changes the development port. `VITE_API_BASE_URL` sets a build-time fallback; the external `config.js` takes priority. `npm run package` produces a versioned ZIP and SHA-256 file containing the static site, this README, and license notices.

`src/core` contains routing, requests, and session state; `src/shared` contains native dialog/form/paging controls; `src/features` contains administration, authentication, jobs, instances, workflows, containers, and scheduling. Unit tests are in `tests/unit`; real browser regression tests are in `tests/e2e`. Browser tests require a separately configured isolated Server/Worker environment and private credentials, which are never included in this repository or the release.

## Prerelease scope

The backend API and persisted DTO contract remain compatible with Server 5.1.6. The UI includes application/namespace permissions, account management, all existing job schedules and execution modes, workflow nodes and execution controls, online/archived logs, Git/FatJar containers, and Java 8/11 templates. CRON quick setup supports six common Quartz rules; complex expressions remain editable.

This is a prerelease. Real third-party OAuth sign-in still requires configured provider accounts and callback infrastructure for final acceptance. Server 5.1.6's Worker JAR download limitation with a nonempty Server context path remains a backend limitation; Console static-subdirectory hosting is a separate capability. Consult the release notes for the actual tested scope.

Manrope is served locally under the SIL Open Font License. Its complete license and runtime dependency notices are included in the distribution.
