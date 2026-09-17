// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma stops auto-loading .env once a prisma.config.ts exists — it hands
// env loading control to this file instead. Without the import above,
// DATABASE_URL (and anything else from .env) silently disappears from
// every prisma CLI command (migrate, generate, studio, etc.).
//
// When `schema` points at a folder (multi-file schema, as used here),
// Prisma always looks for migrations inside that folder — prisma/schema/migrations,
// not prisma/migrations — regardless of prisma version. There's no supported
// config override for this in the pinned prisma@6.7.0: the `migrations` config
// key (path, seed, etc.) exists in newer @prisma/config releases but is a
// silent no-op here — verified via DEBUG=prisma:* that it's never even read,
// silently falling back to package.json#prisma instead. So the migrations
// folder itself lives at prisma/schema/migrations to match Prisma's actual
// convention (see GH issue #39), and `seed` stays in package.json#prisma
// (below) rather than here, since that's what this version actually reads.
export default defineConfig({
    earlyAccess: true,
    schema: "prisma/schema",
});
