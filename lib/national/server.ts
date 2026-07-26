import { countRows, latestRow, storeConfigured } from '@/lib/pipeline/store'

interface TimestampRow {
  updated_at?: string
  created_at?: string
}

function configured(name: string): boolean {
  return Boolean(process.env[name])
}

export function nationalResourceStatus() {
  return {
    controlPlane: configured('NATIONAL_CONTROL_PLANE_URL'),
    operatingManual: configured('NATIONAL_OPERATING_MANUAL_URL'),
    subcontractorSop: configured('NATIONAL_SUBCONTRACTOR_SOP_URL'),
    driveRoot: configured('NATIONAL_DRIVE_ROOT_URL')
  }
}

export async function getNationalOverview() {
  const checkedAt = new Date().toISOString()
  if (!storeConfigured()) {
    return {
      ok: false,
      status: 'not_configured',
      checked_at: checkedAt,
      source: 'public.bidgenius_*',
      resources: nationalResourceStatus()
    }
  }

  try {
    const [
      contractors,
      qualifiedContractors,
      opportunities,
      qualifiedOpportunities,
      reviewPending,
      latestContractor,
      latestOpportunity
    ] = await Promise.all([
      countRows('bidgenius_contractors'),
      countRows('bidgenius_contractors', 'status=eq.qualified'),
      countRows('bidgenius_opportunities'),
      countRows('bidgenius_opportunities', 'status=eq.qualified'),
      countRows('bidgenius_fulfillments', 'status=eq.review_pending'),
      latestRow<TimestampRow>('bidgenius_contractors'),
      latestRow<TimestampRow>('bidgenius_opportunities')
    ])

    return {
      ok: true,
      status: 'operational',
      checked_at: checkedAt,
      source: 'public.bidgenius_*',
      contractors: {
        candidates: contractors,
        qualified: qualifiedContractors,
        latest_update: latestContractor?.updated_at || latestContractor?.created_at || null
      },
      opportunities: {
        total: opportunities,
        qualified: qualifiedOpportunities,
        latest_update: latestOpportunity?.updated_at || latestOpportunity?.created_at || null
      },
      approvals: {
        review_pending: reviewPending
      },
      resources: nationalResourceStatus(),
      rules: {
        candidate_records_are_approved_contractors: false,
        live_outbound_default: false,
        compliance_required_before_assignment: true
      }
    }
  } catch {
    return {
      ok: false,
      status: 'degraded',
      checked_at: checkedAt,
      source: 'public.bidgenius_*',
      error: 'national_metrics_unavailable',
      resources: nationalResourceStatus()
    }
  }
}
