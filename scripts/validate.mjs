import { access, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const requiredFiles = [
  'app/api/pipeline/discover/route.ts',
  'app/api/pipeline/opportunities/discover/route.ts',
  'app/api/pipeline/fulfill/route.ts',
  'app/api/pipeline/review/route.ts',
  'app/api/pipeline/send-approved/route.ts',
  'app/api/national/overview/route.ts',
  'lib/national.mjs',
  'lib/pipeline/auth.ts',
  'lib/pipeline/store.ts',
  'supabase/migrations/20260724_bidgenius_autonomous_pipeline.sql',
  'supabase/migrations/20260726_bidgenius_national_extension.sql',
  'supabase/migrations/20260726_bidgenius_national_extension_rollback.sql'
]

for (const file of requiredFiles) await access(file)

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
for (const script of ['build', 'typecheck', 'test', 'validate']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing required npm script: ${script}`)
}

const migration = await readFile('supabase/migrations/20260726_bidgenius_national_extension.sql', 'utf8')
for (const required of [
  'enable row level security',
  'bidgenius_state_registry',
  'bidgenius_contractor_profiles',
  'bidgenius_subcontractors',
  'bidgenius_sync_checkpoints',
  'bidgenius_validation_receipts'
]) {
  if (!migration.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`National migration is missing: ${required}`)
  }
}

const forbiddenPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s]/,
  /PIPELINE_SECRET\s*=\s*[^\s]/,
  /KEVIN_REVIEW_SECRET\s*=\s*[^\s]/,
  /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/,
  /drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{20,}/
]

const filesToScan = ['README.md', '.env.example', 'lib/national.mjs', 'docs/NATIONAL_MERGE_ARCHITECTURE.md']
for (const file of filesToScan) {
  const text = await readFile(file, 'utf8')
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) throw new Error(`Potential secret or private resource leaked in ${file}`)
  }
}

const tests = spawnSync(process.execPath, ['--test', 'tests/*.test.mjs'], {
  shell: true,
  stdio: 'inherit'
})
if (tests.status !== 0) process.exit(tests.status ?? 1)

console.log(JSON.stringify({ ok: true, requiredFiles: requiredFiles.length, validation: 'passed' }))
