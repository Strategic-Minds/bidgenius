import type { TerritoryTarget } from './types'

const INDUSTRIES = [
  'commercial concrete contractor',
  'concrete polishing contractor',
  'epoxy flooring contractor',
  'industrial flooring contractor',
  'general contractor',
]

const METROS: Record<string, string[]> = {
  ME: ['Portland', 'Bangor', 'Augusta'],
  NH: ['Manchester', 'Nashua', 'Concord'],
  VT: ['Burlington', 'Montpelier', 'Rutland'],
  MA: ['Boston', 'Worcester', 'Springfield'],
  RI: ['Providence', 'Warwick'],
  CT: ['Hartford', 'New Haven', 'Stamford', 'Bridgeport'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
  NJ: ['Newark', 'Jersey City', 'Trenton', 'Atlantic City'],
  PA: ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Allentown', 'Erie'],
  DE: ['Wilmington', 'Dover'],
  MD: ['Baltimore', 'Annapolis', 'Frederick'],
  DC: ['Washington'],
  VA: ['Richmond', 'Virginia Beach', 'Norfolk', 'Arlington', 'Roanoke'],
  WV: ['Charleston', 'Morgantown', 'Huntington'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Wilmington', 'Asheville'],
  SC: ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach'],
  GA: ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Columbus'],
  FL: ['Miami', 'Fort Lauderdale', 'West Palm Beach', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee', 'Fort Myers'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Dayton'],
  KY: ['Louisville', 'Lexington', 'Bowling Green'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
  AL: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
  MS: ['Jackson', 'Gulfport', 'Hattiesburg'],
}

export const EASTERN_STATES = Object.keys(METROS)

export const EASTERN_TERRITORIES: TerritoryTarget[] = Object.entries(METROS).flatMap(
  ([state, cities]) => cities.map(city => ({ state, city, industries: INDUSTRIES }))
)

export function territoryAt(cursor = 0): { target: TerritoryTarget; nextCursor: number; complete: boolean } {
  const safeCursor = Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0
  const index = safeCursor % EASTERN_TERRITORIES.length
  const nextCursor = index + 1
  return {
    target: EASTERN_TERRITORIES[index],
    nextCursor,
    complete: nextCursor >= EASTERN_TERRITORIES.length,
  }
}

export function territoryByStateCity(state?: string, city?: string): TerritoryTarget | null {
  if (!state || !city) return null
  const normalizedState = state.trim().toUpperCase()
  const normalizedCity = city.trim().toLowerCase()
  return EASTERN_TERRITORIES.find(
    target => target.state === normalizedState && target.city.toLowerCase() === normalizedCity
  ) || { state: normalizedState, city: city.trim(), industries: INDUSTRIES }
}
