# PowerJob Console 5.1.6_fev2-rc.1

An independent Vue 3 console for PowerJob. This release refreshes the application layout, forms, tables, workflow editor and execution details while preserving the existing Server API and hash routes.

The release prefix follows the validated PowerJob Server version: **5.1.6**. `fev2` denotes the second frontend generation, implemented with **Vue 3**. The public release/tag is `5.1.6_fev2-rc.1`; the private npm package uses the equivalent valid SemVer `5.1.6-fev2.rc.1`.

This is a prerelease. Real third-party OAuth login and provider callbacks have not yet been accepted against a configured provider; their automated request/encoding contract tests do not replace that acceptance.

PowerJob Server 5.1.6 has a known container deployment limitation when `server.servlet.context-path` is nonempty: the JAR download URL sent to Workers omits that path. Console preserves the configured context path for uploads and WebSockets, but cannot correct the Server-generated download URL. Use the default Server context path for EXTERNAL container deployment with this Server version. Deployment progress means the Server has dispatched requests; check the Worker list for each deployment result.

Console has its own version and release artifacts. Installing it does not require changing PowerJob Server, Worker or Java SDK versions. The validated Server/browser combinations are listed in the release notes; other combinations need separate verification.

## Development

Use Node.js 24 and install the exact dependency versions from the lockfile:

```sh
npm ci
npm run dev
```

The development server listens on `127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:7700`, including container deployment WebSockets. Set `POWERJOB_DEV_SERVER` to change that target. The application uses Vue 3, Vue Router, Pinia, Element Plus, Vite and Monaco; it does not load the Vue 2 compatibility runtime.

```sh
npm run lint
npm test
npm run build
npm run preview
```

`npm run serve` remains an alias for development. `npm run build_spring` creates the same portable static distribution; it never copies files into PowerJob Server.

## Independent static deployment

Download and extract the Console release archive, then serve its `dist` directory with a static web server. Hash routes support refreshing and sharing job/workflow links without a server-side route rewrite. The build uses relative asset paths and supports hosting under a directory such as `/console/`.

Configure the API destination in `dist/config.js` **before loading the page**:

```js
window.POWERJOB_CONFIG = { apiBaseUrl: 'https://powerjob.example.invalid/powerjob' }
```

The URL includes any Server context path and port. Container WebSockets use the same destination, with `https` mapped to `wss`. An empty URL uses the current origin and directory; `VITE_API_BASE_URL` is an optional build-time fallback. When Console and Server have different origins, configure the existing Server/reverse proxy's CORS and WebSocket forwarding for that deployment. Never put credentials in `config.js`.

The Console retains the `PowerJwt`, `Power_appId`, `oms_lang` and legacy `lang` browser preferences. Application, namespace and user permissions are enforced by the Server. IDs larger than JavaScript's safe integer range are kept as strings.

## Testing

Unit and component tests verify request/DTO compatibility, form validation, lifecycle cleanup, workflow topology, Monaco and regression scenarios. They do not replace real browser acceptance against a Server and Workers.

The Playwright suite requires a dedicated test environment and an external credentials file. Its credential schema includes `isolated_test_environment: true`, `admin_username`, `admin_password`, `app_id`, `app_name` and `server_urls`; use synthetic test accounts and never commit the file.

```sh
POWERJOB_E2E_CREDENTIALS=/absolute/path/to/isolated-test-credentials.json npm run test:e2e
```

An installed Chrome can be selected with `POWERJOB_E2E_CHROME`; otherwise install Playwright Chromium with `npx playwright install chromium`. Authenticated traces are disabled and screenshots mask sensitive inputs. Test objects use a unique run identifier and cleanup must complete before reusing the environment.

## Release and rollback

Run `npm run check` and the real browser acceptance suite, then `npm run package` (Python 3 is used only to create the ZIP archive) to create a versioned static archive and SHA-256 checksums in `release/`. The archive includes the compiled application, this guide, the project license and third-party notices. Do not ship test credentials, authenticated traces or local runtime evidence.

Keep the previous Console distribution and API configuration. To roll back, point the static web server at that previous distribution. Console performs no database migration. Verify login, existing jobs, workflow details and logs after switching versions.

[PowerJob documentation](https://www.yuque.com/powerjob/guidence)
