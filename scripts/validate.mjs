import { access, readFile, readdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { spawnSync } from 'node:child_process'

const requiredFiles = [
  'app/api/pipeline/discover/route.ts',
  'app/api/pipeline/opportunities/discover/route.ts',
  'app/api/pipeline/fulfill/route.ts',
  'app/api/pipeline/review/route.ts',
  'app/api/pipeline/send-approved/route.ts',
  'app/api/proposals/draft/route.ts',
  'app/api/send-proposal/route.ts',
  'app/api/takeoff/route.ts',
  'app/api/parse-plans/route.ts',
  'app/api/health/route.ts',
  'app/api/national/overview/route.ts',
  'lib/national.mjs',
  'lib/pipeline/auth.ts',
  'lib/pipeline/store.ts',
  'public/sw.js',
  'middleware.ts',
  'supabase/migrations/20260724_bidgenius_autonomous_pipeline.sql',
  'supabase/migrations/20260726_bidgenius_national_extension.sql',
  'supabase/migrations/20260726_bidgenius_national_extension_rollback.sql',
  'supabase/migrations/20260726_bidgenius_security_hardening.sql',
  'supabase/migrations/20260726_bidgenius_security_hardening_rollback.sql',
  'docs/NATIONAL_MERGE_ARCHITECTURE.md',
  'docs/FORENSIC_AUDIT_2026-07-26.md',
  'docs/HARDENING_ROADMAP.md'
]

for (const file of requiredFiles) await access(file)

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
for (const script of ['build', 'typecheck', 'test', 'validate']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing required npm script: ${script}`)
}

const nationalMigration = await readFile('supabase/migrations/20260726_bidgenius_national_extension.sql', 'utf8')
for (const required of [
  'enable row level security',
  'bidgenius_state_registry',
  'bidgenius_contractor_profiles',
  'bidgenius_subcontractors',
  'bidgenius_sync_checkpoints',
  'bidgenius_validation_receipts'
]) {
  if (!nationalMigration.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`National migration is missing: ${required}`)
  }
}

const securityMigration = await readFile('supabase/migrations/20260726_bidgenius_security_hardening.sql', 'utf8')
for (const required of [
  'bidgenius_outbound_one_active_per_fulfillment_idx',
  'bidgenius_enforce_fulfillment_transition',
  'bidgenius_enforce_outbound_evidence',
  'ACTIVE_OUTBOUND_DUPLICATES_FOUND'
]) {
  if (!securityMigration.includes(required)) throw new Error(`Security migration is missing: ${required}`)
}

async function textFiles(root) {
  const results = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) results.push(...await textFiles(path))
    else if (['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.sql'].includes(extname(entry.name))) results.push(path)
  }
  return results
}

const forbiddenPatterns = [
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]/, label: 'committed Supabase service key' },
  { pattern: /PIPELINE_SECRET\s*=\s*[^\s#]/, label: 'committed pipeline secret' },
  { pattern: /KEVIN_REVIEW_SECRET\s*=\s*[^\s#]/, label: 'committed review secret' },
  { pattern: /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/, label: 'private key material' },
  { pattern: /drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{20,}/, label: 'private Drive folder identifier' },
  { pattern: /jeremy@shopxps\.com/i, label: 'hardcoded internal recipient' },
  { pattern: /info@epoxywillchangeyourlife\.com/i, label: 'hardcoded internal account' },
  { pattern: /strategicmindsadvisory@gmail\.com/i, label: 'hardcoded internal account' },
  { pattern: /jeremy@strategicmindsai\.com/i, label: 'hardcoded internal account' },
  { pattern: /\$83\.60\/hr|50% markup/i, label: 'proprietary takeoff pricing in source' },
  { pattern: /localStorage\.(getItem|setItem)\(['"]bidgenius_(proposals|settings)['"]\)/, label: 'sensitive browser-side persistence' }
]

const scanRoots = ['app', 'components', 'lib', 'public', 'scripts', 'supabase']
const scanFiles = ['README.md', '.env.example']
for (const root of scanRoots) scanFiles.push(...await textFiles(root))

const validatorPath = normalize('scripts/validate.mjs')
for (const file of scanFiles) {
  // The validator necessarily contains the detector expressions themselves.
  // Excluding only this file avoids a self-referential false positive while all runtime source remains scanned.
  if (normalize(file) === validatorPath) continue
  const text = await readFile(file, 'utf8')
  for (const { pattern, label } of forbiddenPatterns) {
    if (pattern.test(text)) throw new Error(`${label} detected in ${file}`)
  }
}

const serviceWorker = await readFile('public/sw.js', 'utf8')
for (const forbidden of ['API_CACHE', 'syncPendingBids', "caches.open('bidgenius-pending')"]) {
  if (serviceWorker.includes(forbidden)) throw new Error(`Unsafe service-worker behavior detected: ${forbidden}`)
}

const takeoff = await readFile('app/api/takeoff/route.ts', 'utf8')
for (const required of ['operatorAuthorized', 'TAKEOFF_PRIVATE_CONTEXT', 'AbortSignal.timeout', 'invalid_ai_payload']) {
  if (!takeoff.includes(required)) throw new Error(`Takeoff hardening missing: ${required}`)
}

const outbound = await readFile('app/api/send-proposal/route.ts', 'utf8')
for (const required of ['pipelineAuthorized', 'verifyApprovalSignature', 'PIPELINE_EXECUTION_ENABLED', 'OUTBOUND_ENABLED', 'Idempotency-Key']) {
  if (!outbound.includes(required)) throw new Error(`Outbound hardening missing: ${required}`)
}

const approvedOutbound = await readFile('app/api/pipeline/send-approved/route.ts', 'utf8')
for (const required of ['PIPELINE_EXECUTION_ENABLED', 'OUTBOUND_ENABLED', "status: 'queued'", 'verifyApprovalSignature', 'bidgenius_suppression']) {
  if (!approvedOutbound.includes(required)) throw new Error(`Approved outbound hardening missing: ${required}`)
}

const draftRoute = await readFile('app/api/proposals/draft/route.ts', 'utf8')
for (const required of ['operatorAuthorized', "status: 'review_pending'", 'escapeHtml', 'recordRun']) {
  if (!draftRoute.includes(required)) throw new Error(`Draft queue protection missing: ${required}`)
}

const cron = await readFile('app/api/cron/pipeline/route.ts', 'utf8')
if (!cron.includes('if (!execute)') || !cron.includes("gate: 'OUTBOUND_ENABLED'")) {
  throw new Error('Cron execution gates are incomplete')
}

const tests = spawnSync(process.execPath, ['--test', 'tests/national.test.mjs'], {
  stdio: 'inherit'
})
if (tests.status !== 0) process.exit(tests.status ?? 1)

console.log(JSON.stringify({
  ok: true,
  requiredFiles: requiredFiles.length,
  scannedFiles: scanFiles.length - 1,
  validation: 'passed'
}))
