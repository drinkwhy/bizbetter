# BizBetter private pilot deployment

## Target

Deploy a single-user / trusted-team private workspace. Do not enable public signup or multi-tenant access in this phase.

## Current deployment prerequisites

- [ ] Run a security review of the new password sign-in, signed 8-hour HttpOnly session, and middleware coverage for every page/API route.
- [ ] Configure `BIZBETTER_ADMIN_PASSWORD` (16+ characters) and `BIZBETTER_SESSION_SECRET` (32+ random characters) in the host secret manager.
- [ ] Verify same-origin write protection and login throttling behind the actual reverse proxy.
- [ ] Keep the single-owner private-pilot boundary; do not add public signup or multi-tenant access.
- [ ] Configure a private access gateway (for example, Cloudflare Access) as a second perimeter, not as a replacement for app-level authentication.
- [ ] Configure a persistent volume and set `BIZBETTER_DATA_DIR` to its mount path.
- [ ] Set `DATABASE_URL` to a persistent SQLite database path for the initial single-instance pilot.
- [ ] Back up the existing `.bizbetter-data` directory before moving or deploying it.
- [ ] Configure QuickBooks OAuth in sandbox first and register the exact HTTPS callback URI.
- [ ] Verify that financial exports, uploaded files, logs, and backups are not publicly accessible.
- [ ] Run all repository verification scripts and a browser QA pass before inviting anyone.

## Hosting shape

Use one Node.js web service and one persistent volume. Keep the app at one replica while SQLite and local filesystem storage are in use. Do not run multiple app replicas against the same SQLite file.

Suggested volume mount: `/app/.bizbetter-data`

Set:

```env
BIZBETTER_DATA_DIR=/app/.bizbetter-data
DATABASE_URL=file:/app/.bizbetter-data/bizbetter.db
BIZBETTER_QBO_ENV=sandbox
```

The SQLite URL must be confirmed against the deployed Prisma configuration before the first production migration. Do not run `prisma db push` against a production database without a backup and schema review.

## Build and start

Build:

```sh
npx prisma generate && npm run build
```

Start:

```sh
npm run start -- --hostname 0.0.0.0 --port $PORT
```

Health check path: `/api/health`

## Mobile installation

The app now has a web app manifest and scalable SVG icon. Verify Android Chrome's install prompt on the deployed HTTPS origin. For broad Android install compatibility, add dedicated 192px and 512px PNG icons and test the manifest with Lighthouse before calling the PWA install-ready.

## Data and integration boundaries

- The first pilot is one trusted workspace, not a multi-tenant SaaS.
- Toast and QuickBooks imports must be reviewed before committing.
- Never commit API keys, OAuth secrets, customer data, payroll data, or financial exports.
- QuickBooks production OAuth and any real financial sync require explicit owner approval.
- Do not expose the service publicly until the authentication and authorization checklist above is complete.

## Work completed on this branch

- Added password-based private sign-in, an HMAC-signed 8-hour HttpOnly session, middleware protection for pages and API routes, and a sign-out control.
- Updated the existing local-only API guard to accept only the trusted middleware marker for authenticated hosted requests.
- Added `BIZBETTER_DATA_DIR` support for evidence storage, staged imports, and integration snapshots.
- Added a lightweight no-store health endpoint.
- Added the Next.js web app manifest and scalable icon.

## Not yet completed

Security review and end-to-end authentication tests, full QuickBooks historical sync, Toast API integration, database migration strategy, production secrets, hosting account configuration, and end-to-end deployment verification remain outstanding.
