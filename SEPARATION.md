# BizBetter separation — 2026-10-04

Independent project: F:\bizbetter
Aegis project: F:\aegis-unified
Original source, configuration, local environment, database, and original build cache preserved outside Aegis: F:\bizbetter-separation-backup-20261004

All 48 original non-generated project files were SHA-256 verified in both the independent project and external rollback copy. Application source, existing configuration, lockfile, schema, README, and environment files were preserved without rewriting. Original dependency caches were partially relocated; the redundant remainder was removed only after the complete independent dependency copy was verified.

BizBetter already had package.json, pnpm lock/workspace files, Next.js and TypeScript configuration, Prisma schema, SQLite database, .env, and node_modules. It had no Git repository or .gitignore. Relative imports and the SQLite configuration were internal to BizBetter. No Aegis-owned source, dependencies, Git history, configuration, or secrets were copied.

A fresh Git repository on main has no commits or remotes. .gitignore excludes local environment files, SQLite databases, dependencies, caches, logs, and the local verification manifest. No commits or pushes were performed.

All 352 dependency links resolve inside F:\bizbetter. Generated dependency launchers were corrected for Windows and WSL, and the Prisma client was regenerated locally without changing the database. Dependency text files contain no references to aegis-unified.

Verification:
- Existing six-engine suite passed in the original and independent projects. This suite uses existing demo fixtures.
- All 11 page routes and GET /api/business returned HTTP 200 before and after removal of original source files.
- A referenced client JavaScript bundle loaded successfully.
- Prisma read the preserved SQLite database successfully; its file hash remained unchanged.
- Production build compiled the application, then failed on the existing Settings type error. Original and independent typechecks both report app/settings/page.tsx:30 (resetToCleanState takes no arguments) and :37 (resetToDemo is missing). These pre-existing issues were preserved.
- pnpm build attempted an automatic install and was blocked by the existing dependency-build approval configuration in pnpm-workspace.yaml. npm run dev works; npm run build reaches the existing Settings type error. Existing configuration was preserved.
- Aegis still has only its pre-existing tracked modification to artifacts/aegis.zip.sha256.

Windows holds the empty original directory F:\aegis-unified\Bizbetter open through the editor/session. No project files remain there. cleanup-original-folder.ps1 removes only that exact directory if it is empty; it never deletes contents. A hidden, bounded cleanup helper retries until the lock is released (up to one hour). You can rerun the script after closing the original workspace if needed.

Start the independent app:

    cd F:\bizbetter
    npm run dev

Temporary verification servers were stopped. No migrations or seeding were run. Environment values and business records were not printed.
