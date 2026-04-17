/**
 * crowdsource-consensus
 *
 * Turn noisy crowdsourced reports into confidence-weighted status
 * with graceful degradation over time.
 */

export { createConsensus, calculateConsensus } from './consensus.js'
export type {
  Report,
  ConsensusResult,
  ConsensusOptions,
  ConfidenceLevel,
} from './types.js'

/**
 * Convenience presets for common decay windows.
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
