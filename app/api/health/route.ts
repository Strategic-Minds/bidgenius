import { NextResponse } from 'next/server'
import { readinessReport } from '@/lib/system/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const report = readinessReport()
  return NextResponse.json({
    ok: report.ok,
    status: report.status,
    checked_at: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    blockers: report.blockers,
    warnings: report.warnings,
    services: {
      database: report.config.database,
      pipeline_auth: report.config.pipelineAuth,
      review_auth: report.config.reviewAuth,
      scraper_bridge: report.config.scraperBridge,
      outbound_provider: report.config.outboundProvider,
      national_resources: report.config.nationalResources
    },
    gates: report.config.gates
  }, {
    status: report.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' }
  })
}
