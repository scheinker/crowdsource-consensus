/**
 * Core types for crowdsource-consensus
 * @module
 */

/**
 * A report from a user indicating the current status of something.
 *
 * @example
 * ```ts
 * const report: Report = {
 *   status: 'up',
 *   timestamp: new Date(),
 *   verified: true,  // GPS-verified location
 * }
 * ```
 */
export interface Report {
  /** The status being reported (e.g., 'up', 'down', 'open', 'closed') */
  status: string
  /** When the report was made. Defaults to now if not provided. */
  timestamp?: Date
  /** Whether the report has been verified (GPS, photo, etc.) */
  verified?: boolean
  /** Custom weight multiplier for this report. Defaults to 1. */
  weight?: number
}

/**
 * Internal report with all fields normalized to required values.
 * @internal
 */
export interface NormalizedReport {
  status: string
  timestamp: Date
  verified: boolean
  weight: number
}

/**
 * Confidence level prefix for the consensus status.
 *
 * - `confirmed` - Strong consensus with verified reports
 * - `likely` - Good agreement or very recent reports
 * - `possibly` - Some reports exist but weak signal
 * - `unknown` - No reports or all reports are stale
 */
export type ConfidenceLevel = 'confirmed' | 'likely' | 'possibly' | 'unknown'

/**
 * Result of a consensus calculation.
 *
 * @example
 * ```ts
 * const result = consensus.getStatus()
 * console.log(result.status)      // 'likely_up'
 * console.log(result.confidence)  // 78
 * console.log(result.level)       // 'likely'
 * ```
 */
export interface ConsensusResult {
  /**
   * The winning status with confidence prefix.
   * @example 'likely_up', 'confirmed_open', 'possibly_available'
   */
  status: string

  /**
   * The raw status without prefix, or null if unknown.
   * @example 'up', 'open', 'available'
   */
  rawStatus: string | null

  /** The confidence level: 'confirmed', 'likely', 'possibly', or 'unknown' */
  level: ConfidenceLevel

  /** Confidence score from 0-100 */
  confidence: number

  /** Number of reports within the decay window */
  reportCount: number

  /** Number of verified reports within the decay window */
  verifiedCount: number

  /** Seconds since the most recent report */
  staleness: number

  /** Timestamp of the most recent report, or null if none */
  lastReport: Date | null
}

/**
 * Callback fired when the consensus status changes.
 *
 * @example
 * ```ts
 * const swing = createConsensus({
 *   decaySeconds: 86400,
 *   onChange: (newStatus, prevStatus) => {
 *     if (newStatus.level === 'confirmed') {
 *       sendNotification(`Swing is ${newStatus.rawStatus}!`)
 *     }
 *   }
 * })
 * ```
 */
export type OnChangeCallback = (
  newStatus: ConsensusResult,
  prevStatus: ConsensusResult | null
) => void

/**
 * Configuration options for creating a consensus calculator.
 *
 * @example
 * ```ts
 * const options: ConsensusOptions = {
 *   decaySeconds: 3600,        // 1 hour
 *   verificationBoost: 20,     // Photos are valuable
 *   confirmThreshold: 3,       // Need 3 reports to confirm
 * }
 * ```
 */
export interface ConsensusOptions {
  /**
   * How long until reports fully decay, in seconds.
   *
   * Choose based on how quickly your status changes:
   * - Parking: 300 (5 minutes)
   * - Food truck: 3600 (1 hour)
   * - Swing status: 86400 (24 hours)
   * - Trail conditions: 604800 (7 days)
   */
  decaySeconds: number

  /**
   * Confidence boost for verified reports (0-100).
   * @default 15
   */
  verificationBoost?: number

  /**
   * Minimum reports needed for "confirmed" status.
   * @default 2
   */
  confirmThreshold?: number

  /**
   * Minimum agreement ratio for strong consensus (0-1).
   * @default 0.6 (60%)
   */
  agreementThreshold?: number

  /**
   * Base confidence score when reports exist.
   * @default 70
   */
  baseConfidence?: number

  /**
   * Status to return when no reports exist or all are stale.
   * @default "unknown"
   */
  unknownStatus?: string

  /**
   * Callback fired when the consensus status changes after adding a report.
   * Useful for triggering notifications, webhooks, or UI updates.
   *
   * @example
   * ```ts
   * onChange: (newStatus, prevStatus) => {
   *   if (newStatus.rawStatus !== prevStatus?.rawStatus) {
   *     sendAlert(`Status changed to ${newStatus.rawStatus}`)
   *   }
   * }
   * ```
   */
  onChange?: OnChangeCallback
}

/**
 * Serialized snapshot of consensus state for persistence.
 *
 * @example
 * ```ts
 * // Save to database
 * const snapshot = consensus.toJSON()
 * await db.save('swing-status', snapshot)
 *
 * // Restore later
 * const saved = await db.load('swing-status')
 * const consensus = createConsensus({ decaySeconds: 86400 }, saved)
 * ```
 */
export interface ConsensusSnapshot {
  /** Serialized reports with ISO timestamp strings */
  reports: Array<{
    status: string
    timestamp: string
    verified: boolean
    weight: number
  }>
  /** When this snapshot was created */
  savedAt: string
  /** Package version for compatibility checking */
  version: string
}
