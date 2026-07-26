import { systemConfigReport } from '@/lib/system/config'

const GOLD = '#C9A84C'

function Status({ label, configured, note }: { label: string; configured: boolean; note: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #F0ECE4' }}>
      <div>
        <div style={{ fontSize: 13, color: '#27241F', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#8A857C', marginTop: 3, lineHeight: 1.5 }}>{note}</div>
      </div>
      <span style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '4px 9px', background: configured ? '#EEF9EF' : '#FFF5DF', color: configured ? '#287A35' : '#8A6616' }}>
        {configured ? 'Configured' : 'Required'}
      </span>
    </div>
  )
}

export default function SettingsPage() {
  const config = systemConfigReport()
  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Protected configuration</div>
        <h1 style={{ margin: '6px 0', fontSize: 28, color: '#111' }}>System Settings</h1>
        <p style={{ margin: 0, maxWidth: 720, color: '#777', lineHeight: 1.6, fontSize: 13 }}>
          This screen reports whether protected capabilities are configured. It never displays secret values, private pricing, customer data, personal addresses, or internal recipient lists. Changes belong in the approved environment and configuration workflow.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
        <section style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, padding: '4px 20px' }}>
          <h2 style={{ margin: '18px 0 4px', fontSize: 15 }}>Core Services</h2>
          <Status label="Database" configured={config.database} note="Server-only Supabase URL and service role." />
          <Status label="Pipeline authentication" configured={config.pipelineAuth} note="Pipeline or cron secret for internal workers." />
          <Status label="Review authentication" configured={config.reviewAuth} note="Separate approval key and named reviewer identity." />
          <Status label="XTREME-SCRAPER bridge" configured={config.scraperBridge && config.scraperBridgeAuth} note="Authenticated contractor discovery integration." />
          <Status label="Opportunity feeds" configured={config.opportunityFeeds} note="Approved HTTPS feed manifest." />
        </section>

        <section style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, padding: '4px 20px' }}>
          <h2 style={{ margin: '18px 0 4px', fontSize: 15 }}>Protected Operations</h2>
          <Status label="Administrative authentication" configured={config.gates.adminUiAuthEnabled} note="Interim UI protection. Production SSO remains the preferred target." />
          <Status label="Pipeline execution" configured={config.gates.pipelineExecutionEnabled} note="When disabled, scheduled phases invoke no external work." />
          <Status label="Outbound delivery" configured={config.gates.outboundEnabled && config.outboundProvider} note="Requires provider configuration and a separate outbound switch." />
          <Status label="National control plane" configured={config.nationalResources.controlPlane} note="Private resource location supplied outside source control." />
          <Status label="National operating manual" configured={config.nationalResources.operatingManual} note="Private operating evidence supplied outside source control." />
        </section>
      </div>

      <div style={{ marginTop: 20, borderRadius: 14, background: '#111', color: '#fff', padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Configuration changes are approval-gated</div>
        <div style={{ color: '#C9C5BC', fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
          Do not paste keys, pricing rules, personal information, or customer records into this page. Update the protected environment, validate the preview, record a receipt, and promote only after operator approval.
        </div>
      </div>
    </div>
  )
}
