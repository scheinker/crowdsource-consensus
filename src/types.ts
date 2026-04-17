/**
 * Core types for crowdsource-consensus
 */

/** A report from a user */
export interface Report {
  status: string
  timestamp?: Date
  verified?: boolean
  weight?: number
}

/** Internal report with normalized fields */
export interface NormalizedReport {
  status: string
  timestamp: Date
  verified: boolean
  weight: number
}

/** Confidence level prefix */
export type ConfidenceLevel = 'confirmed' | 'likely' | 'possibly' | 'unknown'

/** Result of consensus calculation */
export interface ConsensusResult {
  /** The winning status with confidence prefix (e.g., "likely_up") */
  status: string
  /** The raw status without prefix (e.g., "up") */
  rawStatus: string | null
  /** Confidence level */
  level: ConfidenceLevel
  /** Confidence score 0-100 */
  confidence: number
  /** Number of reports in the decay window */
  reportCount: number
  /** Number of verified reports */
  verifiedCount: number
  /** Time since most recent report in seconds */
  staleness: number
  /** Most recent report timestamp, if any */
  lastReport: Date | null
}

/** Configuration options */
export interface ConsensusOptions {
  /**
   * How long until reports fully decay, in seconds.
   * - Parking: 300 (5 minutes)
   * - Food truck: 3600 (1 hour)
   * - Swing status: 86400 (24 hours)
   * - Trail conditions: 604800 (7 days)
   */
  decaySeconds: number

  /**
   * Confidence boost for verified reports (0-100).
   * Default: 15
   */
  verificationBoost?: number

  /**
   * Minimum reports needed for "confirmed" status.
   * Default: 2
   */
  confirmThreshold?: number

  /**
   * Minimum agreement ratio for strong consensus (0-1).
   * Default: 0.6 (60%)
   */
  agreementThreshold?: number

  /**
   * Base confidence score when reports exist.
   * Default: 70
   */
  baseConfidence?: number

  /**
   * Status to return when no reports exist or all are stale.
   * Default: "unknown"
   */
  unknownStatus?: string
}
