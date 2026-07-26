export interface NationalState {
  readonly code: string
  readonly name: string
  readonly region: 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'West'
  readonly operatingStatus: 'active'
  readonly complianceStatus: 'research_required'
  readonly commercialLane: true
  readonly governmentLane: true
  readonly contractorLane: true
  readonly subcontractorLane: true
  readonly bidLane: true
  readonly projectLane: true
}

export const nationalStates: readonly NationalState[]
export const subcontractorLifecycle: readonly string[]
export const subcontractorBlockers: readonly string[]
export const minimumCompliance: readonly string[]
export const contractorSelectionWeights: Readonly<Record<string, number>>
export const subcontractorSelectionWeights: Readonly<Record<string, number>>
export const promotionRules: readonly string[]
export function weightsTotal(weights: Readonly<Record<string, number>>): number
