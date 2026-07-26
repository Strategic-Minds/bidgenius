const STATE_ROWS = [
  ['AL','Alabama','Southeast'],['AK','Alaska','West'],['AZ','Arizona','Southwest'],['AR','Arkansas','Southeast'],['CA','California','West'],['CO','Colorado','West'],['CT','Connecticut','Northeast'],['DE','Delaware','Southeast'],['FL','Florida','Southeast'],['GA','Georgia','Southeast'],['HI','Hawaii','West'],['ID','Idaho','West'],['IL','Illinois','Midwest'],['IN','Indiana','Midwest'],['IA','Iowa','Midwest'],['KS','Kansas','Midwest'],['KY','Kentucky','Southeast'],['LA','Louisiana','Southeast'],['ME','Maine','Northeast'],['MD','Maryland','Southeast'],['MA','Massachusetts','Northeast'],['MI','Michigan','Midwest'],['MN','Minnesota','Midwest'],['MS','Mississippi','Southeast'],['MO','Missouri','Midwest'],['MT','Montana','West'],['NE','Nebraska','Midwest'],['NV','Nevada','West'],['NH','New Hampshire','Northeast'],['NJ','New Jersey','Northeast'],['NM','New Mexico','Southwest'],['NY','New York','Northeast'],['NC','North Carolina','Southeast'],['ND','North Dakota','Midwest'],['OH','Ohio','Midwest'],['OK','Oklahoma','Southwest'],['OR','Oregon','West'],['PA','Pennsylvania','Northeast'],['RI','Rhode Island','Northeast'],['SC','South Carolina','Southeast'],['SD','South Dakota','Midwest'],['TN','Tennessee','Southeast'],['TX','Texas','Southwest'],['UT','Utah','West'],['VT','Vermont','Northeast'],['VA','Virginia','Southeast'],['WA','Washington','West'],['WV','West Virginia','Southeast'],['WI','Wisconsin','Midwest'],['WY','Wyoming','West']
]

export const nationalStates = Object.freeze(STATE_ROWS.map(([code,name,region]) => Object.freeze({
  code,
  name,
  region,
  operatingStatus: 'active',
  complianceStatus: 'research_required',
  commercialLane: true,
  governmentLane: true,
  contractorLane: true,
  subcontractorLane: true,
  bidLane: true,
  projectLane: true
})))

export const subcontractorLifecycle = Object.freeze([
  'lead','invited','prequalification_in_progress','compliance_review','approved',
  'bid_invited','quoted','selected','contracted','mobilizing','active','punch',
  'closeout','scored','archived'
])

export const subcontractorBlockers = Object.freeze([
  'missing_w9','expired_coi','license_invalid','safety_review','agreement_missing',
  'debarred_or_excluded','capacity_unavailable','quote_incomplete','conflict_unresolved',
  'suspended','dispute','claim','quarantined'
])

export const minimumCompliance = Object.freeze([
  'legal_identity','w9_status','insurance','licenses','safety','agreements',
  'capacity','equipment','geographic_coverage','debarment_check','conflict_check'
])

export const contractorSelectionWeights = Object.freeze({
  xpsCustomerRelationship: 0.20,
  productPurchaseHistory: 0.10,
  trainingHistory: 0.10,
  geographicFit: 0.10,
  crewAndEquipmentCapacity: 0.15,
  relevantExperience: 0.10,
  licensesInsuranceBonding: 0.10,
  safetyHistory: 0.05,
  performanceHistory: 0.10
})

export const subcontractorSelectionWeights = Object.freeze({
  compliance: 0.20,
  relevantExperience: 0.15,
  crewAndEquipmentCapacity: 0.15,
  scheduleAvailability: 0.15,
  priceCompetitiveness: 0.15,
  qualityHistory: 0.10,
  safetyHistory: 0.05,
  communicationAndDocumentation: 0.05
})

export const promotionRules = Object.freeze([
  'Scraped records remain unverified candidates.',
  'Fingerprint is the canonical ingestion identity.',
  'No contractor becomes assignable without identity, consent, compliance and capacity verification.',
  'No subcontractor assignment may bypass a blocking compliance condition.',
  'No external communication may be sent without an approval receipt and suppression check.'
])

export function weightsTotal(weights) {
  return Object.values(weights).reduce((sum, value) => sum + Number(value), 0)
}
