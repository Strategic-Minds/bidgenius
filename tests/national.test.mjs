import test from 'node:test'
import assert from 'node:assert/strict'
import {
  contractorSelectionWeights,
  minimumCompliance,
  nationalStates,
  promotionRules,
  subcontractorBlockers,
  subcontractorLifecycle,
  subcontractorSelectionWeights,
  weightsTotal
} from '../lib/national.mjs'

test('national registry contains 50 unique states', () => {
  assert.equal(nationalStates.length, 50)
  assert.equal(new Set(nationalStates.map(state => state.code)).size, 50)
  assert.equal(new Set(nationalStates.map(state => state.name)).size, 50)
})

test('all states expose governed operating lanes', () => {
  for (const state of nationalStates) {
    assert.equal(state.operatingStatus, 'active')
    assert.equal(state.complianceStatus, 'research_required')
    assert.equal(state.commercialLane, true)
    assert.equal(state.governmentLane, true)
    assert.equal(state.contractorLane, true)
    assert.equal(state.subcontractorLane, true)
  }
})

test('selection models total exactly 100 percent', () => {
  assert.ok(Math.abs(weightsTotal(contractorSelectionWeights) - 1) < 1e-9)
  assert.ok(Math.abs(weightsTotal(subcontractorSelectionWeights) - 1) < 1e-9)
})

test('subcontractor lifecycle includes qualification and closeout gates', () => {
  assert.equal(subcontractorLifecycle[0], 'lead')
  assert.equal(subcontractorLifecycle.at(-1), 'archived')
  for (const state of ['compliance_review', 'approved', 'contracted', 'closeout', 'scored']) {
    assert.ok(subcontractorLifecycle.includes(state))
  }
})

test('critical compliance blockers cannot disappear silently', () => {
  for (const blocker of ['missing_w9', 'expired_coi', 'license_invalid', 'debarred_or_excluded', 'agreement_missing']) {
    assert.ok(subcontractorBlockers.includes(blocker))
  }
  for (const requirement of ['legal_identity', 'w9_status', 'insurance', 'licenses', 'debarment_check']) {
    assert.ok(minimumCompliance.includes(requirement))
  }
})

test('promotion rules preserve source-truth and approval boundaries', () => {
  assert.ok(promotionRules.some(rule => rule.includes('unverified candidates')))
  assert.ok(promotionRules.some(rule => rule.includes('Fingerprint')))
  assert.ok(promotionRules.some(rule => rule.includes('approval receipt')))
})
