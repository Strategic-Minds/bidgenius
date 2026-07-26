export function systemConfigReport() {
  const has = (name: string) => Boolean(process.env[name])
  return {
    database: has('SUPABASE_URL') && has('SUPABASE_SERVICE_ROLE_KEY'),
    pipelineAuth: has('PIPELINE_SECRET') || has('CRON_SECRET'),
    reviewAuth: has('KEVIN_REVIEW_SECRET'),
    scraperBridge: has('XTREME_SCRAPER_URL'),
    scraperBridgeAuth: has('XTREME_SCRAPER_SECRET') || has('PIPELINE_SECRET'),
    opportunityFeeds: has('PUBLIC_BID_FEEDS_JSON'),
    outboundProvider: has('RESEND_API_KEY') && has('EMAIL_FROM'),
    nationalResources: {
      driveRoot: has('NATIONAL_DRIVE_ROOT_URL'),
      controlPlane: has('NATIONAL_CONTROL_PLANE_URL'),
      operatingManual: has('NATIONAL_OPERATING_MANUAL_URL'),
      subcontractorSop: has('NATIONAL_SUBCONTRACTOR_SOP_URL')
    },
    gates: {
      pipelineExecutionEnabled: process.env.PIPELINE_EXECUTION_ENABLED === 'true',
      outboundEnabled: process.env.OUTBOUND_ENABLED === 'true',
      adminUiAuthEnabled: process.env.ADMIN_UI_AUTH_ENABLED === 'true'
    }
  }
}

export function readinessReport() {
  const config = systemConfigReport()
  const blockers: string[] = []
  const warnings: string[] = []

  if (!config.database) blockers.push('database_not_configured')
  if (!config.pipelineAuth) blockers.push('pipeline_auth_not_configured')
  if (!config.reviewAuth) blockers.push('review_auth_not_configured')
  if (!config.scraperBridge) warnings.push('scraper_bridge_not_configured')
  if (!config.scraperBridgeAuth) warnings.push('scraper_bridge_auth_not_configured')
  if (!config.gates.adminUiAuthEnabled) warnings.push('admin_ui_auth_not_enabled')
  if (config.gates.outboundEnabled && !config.outboundProvider) blockers.push('outbound_enabled_without_provider')
  if (config.gates.outboundEnabled && !config.gates.pipelineExecutionEnabled) warnings.push('outbound_enabled_while_pipeline_execution_disabled')

  return {
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
    blockers,
    warnings,
    config
  }
}
