import { build } from 'esbuild';
await build({entryPoints:{server:'src/server-entry.ts',migrate:'scripts/migrate-postgres.ts'},outdir:'dist',bundle:true,packages:'external',platform:'node',format:'esm',target:'node24',sourcemap:true});
console.log('Built native Node.js server and PostgreSQL migration command.');
