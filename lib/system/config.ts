function configuredJsonArray(name: string): boolean {
  const value = process.env[name] || ''
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

export function systemConfigReport() {
  const has = (name: string) => Boolean(process.env[name]?.trim())
  const adminUiAuthEnabled = process.env.ADMIN_UI_AUTH_ENABLED === 'true'
  return {
    database: has('SUPABASE_URL') && has('SUPABASE_SERVICE_ROLE_KEY'),
    pipelineAuth: has('PIPELINE_SECRET') || has('CRON_SECRET'),
    reviewAuth: has('KEVIN_REVIEW_SECRET'),
    reviewerIdentity: has('REVIEWER_IDENTITY'),
    adminUiAuthConfigured: !adminUiAuthEnabled || (has('ADMIN_UI_AUTH_USER') && has('ADMIN_UI_AUTH_PASSWORD')),
    aiGateway: has('AI_GATEWAY_API_KEY'),
    takeoffPrivateContext: has('TAKEOFF_PRIVATE_CONTEXT'),
    scraperBridge: has('XTREME_SCRAPER_URL'),
    scraperBridgeAuth: has('XTREME_SCRAPER_SECRET') || has('PIPELINE_SECRET'),
    opportunityFeeds: configuredJsonArray('PUBLIC_BID_FEEDS_JSON'),
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
      adminUiAuthEnabled
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
  if (!config.reviewerIdentity) warnings.push('reviewer_identity_not_configured')
  if (!config.gates.adminUiAuthEnabled) warnings.push('admin_ui_auth_not_enabled')
  if (!config.adminUiAuthConfigured) blockers.push('admin_ui_auth_enabled_without_credentials')
  if (!config.aiGateway) warnings.push('ai_gateway_not_configured')
  if (!config.takeoffPrivateContext) warnings.push('takeoff_private_context_not_configured')
  if (!config.scraperBridge) warnings.push('scraper_bridge_not_configured')
  if (!config.scraperBridgeAuth) warnings.push('scraper_bridge_auth_not_configured')
  if (!config.opportunityFeeds) warnings.push('opportunity_feeds_not_configured')

  if (config.gates.pipelineExecutionEnabled) {
    if (!config.database) blockers.push('execution_enabled_without_database')
    if (!config.pipelineAuth) blockers.push('execution_enabled_without_pipeline_auth')
  }
  if (config.gates.outboundEnabled) {
    if (!config.gates.pipelineExecutionEnabled) blockers.push('outbound_enabled_while_pipeline_execution_disabled')
    if (!config.outboundProvider) blockers.push('outbound_enabled_without_provider')
    if (!config.reviewAuth) blockers.push('outbound_enabled_without_review_auth')
  }

  return {
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    config
  }
}
