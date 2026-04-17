/**
 * crowdsource-consensus
 *
 * Turn noisy crowdsourced reports into confidence-weighted status
 * with graceful degradation over time.
 *
 * @example
 * ```ts
 * import { createConsensus, DECAY_PRESETS } from 'crowdsource-consensus'
 *
 * const swing = createConsensus({
 *   decaySeconds: DECAY_PRESETS.daily,
 * })
 *
 * swing.addReport({ status: 'up', verified: true })
 * swing.addReport({ status: 'up' })
 *
 * const result = swing.getStatus()
 * // { status: 'confirmed_up', confidence: 85, ... }
 * ```
 *
 * @packageDocumentation
 */

export { createConsensus, calculateConsensus } from './consensus.js'
export type { Consensus } from './consensus.js'
export type {
  Report,
  ConsensusResult,
  ConsensusOptions,
  ConsensusSnapshot,
  ConfidenceLevel,
} from './types.js'

/**
 * Convenience presets for common decay windows.
 *
 * @example
 * ```ts
 * import { createConsensus, DECAY_PRESETS } from 'crowdsource-consensus'
 *
 * // Parking changes fast
 * const parking = createConsensus({ decaySeconds: DECAY_PRESETS.realtime })
 *
 * // Trail conditions change slowly
 * const trail = createConsensus({ decaySeconds: DECAY_PRESETS.weekly })
 * ```
 */
export const DECAY_PRESETS = {
  /** 5 minutes - parking, bathroom availability */
  realtime: 300,
  /** 1 hour - food trucks, pop-up events */
  hourly: 3600,
  /** 6 hours - daily conditions, crowd levels */
  semiDaily: 21600,
  /** 24 hours - swing status, daily operations */
  daily: 86400,
  /** 7 days - trail conditions, seasonal status */
  weekly: 604800,
} as const
