import {
  Report,
  NormalizedReport,
  ConsensusResult,
  ConsensusOptions,
  ConfidenceLevel,
} from './types.js'

const DEFAULT_OPTIONS: Required<ConsensusOptions> = {
  decaySeconds: 86400, // 24 hours
  verificationBoost: 15,
  confirmThreshold: 2,
  agreementThreshold: 0.6,
  baseConfidence: 70,
  unknownStatus: 'unknown',
}

/**
 * Create a consensus calculator with the given options.
 */
export function createConsensus(options: ConsensusOptions) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const reports: NormalizedReport[] = []

  return {
    /**
     * Add a report to the consensus pool.
     */
    addReport(report: Report): void {
      reports.push({
        status: report.status,
        timestamp: report.timestamp ?? new Date(),
        verified: report.verified ?? false,
        weight: report.weight ?? 1,
      })
    },

    /**
     * Add multiple reports at once.
     */
    addReports(newReports: Report[]): void {
      for (const report of newReports) {
        this.addReport(report)
      }
    },

    /**
     * Clear all reports.
     */
    clear(): void {
      reports.length = 0
    },

    /**
     * Get the current consensus status.
     */
    getStatus(now: Date = new Date()): ConsensusResult {
      return calculateConsensus(reports, config, now)
    },

    /**
     * Get the number of reports (including stale ones).
     */
    get reportCount(): number {
      return reports.length
    },
  }
}

/**
 * Calculate consensus from a set of reports.
 * This is the core algorithm - pure function, no side effects.
 */
export function calculateConsensus(
  reports: NormalizedReport[],
  options: Required<ConsensusOptions>,
  now: Date = new Date()
): ConsensusResult {
  const nowMs = now.getTime()
  const decayMs = options.decaySeconds * 1000

  // Filter to reports within decay window and calculate weights
  const activeReports: Array<NormalizedReport & { decayWeight: number }> = []

  for (const report of reports) {
    const ageMs = nowMs - report.timestamp.getTime()
    if (ageMs < 0 || ageMs >= decayMs) continue

    // Linear decay: 1.0 at time 0, 0.0 at decay boundary
    const decayWeight = 1 - ageMs / decayMs
    activeReports.push({ ...report, decayWeight })
  }

  // No active reports = unknown
  if (activeReports.length === 0) {
    return {
      status: options.unknownStatus,
      rawStatus: null,
      level: 'unknown',
      confidence: 0,
      reportCount: 0,
      verifiedCount: 0,
      staleness: reports.length > 0
        ? (nowMs - Math.max(...reports.map(r => r.timestamp.getTime()))) / 1000
        : Infinity,
      lastReport: reports.length > 0
        ? new Date(Math.max(...reports.map(r => r.timestamp.getTime())))
        : null,
    }
  }

  // Count weighted votes per status
  const votes: Record<string, number> = {}
  let totalWeight = 0
  let verifiedCount = 0

  for (const report of activeReports) {
    const weight = report.weight * report.decayWeight
    votes[report.status] = (votes[report.status] ?? 0) + weight
    totalWeight += weight
    if (report.verified) verifiedCount++
  }

  // Find the winning status
  let winningStatus = ''
  let winningWeight = 0
  for (const [status, weight] of Object.entries(votes)) {
    if (weight > winningWeight) {
      winningStatus = status
      winningWeight = weight
    }
  }

  // Calculate agreement ratio
  const agreementRatio = winningWeight / totalWeight

  // Find most recent report
  const mostRecent = activeReports.reduce((latest, r) =>
    r.timestamp > latest.timestamp ? r : latest
  )
  const stalenessSeconds = (nowMs - mostRecent.timestamp.getTime()) / 1000

  // Determine confidence level
  const level = determineLevel(
    activeReports.length,
    agreementRatio,
    verifiedCount,
    stalenessSeconds,
    options
  )

  // Calculate confidence score
  const confidence = calculateConfidence(
    activeReports.length,
    agreementRatio,
    verifiedCount,
    stalenessSeconds,
    options
  )

  // Build the prefixed status string
  const status = level === 'unknown'
    ? options.unknownStatus
    : `${level}_${winningStatus}`

  return {
    status,
    rawStatus: winningStatus,
    level,
    confidence,
    reportCount: activeReports.length,
    verifiedCount,
    staleness: stalenessSeconds,
    lastReport: mostRecent.timestamp,
  }
}

/**
 * Determine the confidence level based on report characteristics.
 */
function determineLevel(
  reportCount: number,
  agreementRatio: number,
  verifiedCount: number,
  stalenessSeconds: number,
  options: Required<ConsensusOptions>
): ConfidenceLevel {
  const hasEnoughReports = reportCount >= options.confirmThreshold
  const hasStrongAgreement = agreementRatio >= options.agreementThreshold
  const hasVerification = verifiedCount > 0
  const isRecent = stalenessSeconds < options.decaySeconds * 0.25 // Within first 25% of decay window

  // Confirmed: enough reports + strong agreement + verified
  if (hasEnoughReports && hasStrongAgreement && hasVerification) {
    return 'confirmed'
  }

  // Likely: enough reports + strong agreement, OR recent with some agreement
  if (hasEnoughReports && hasStrongAgreement) {
    return 'likely'
  }
  if (isRecent && agreementRatio >= 0.5) {
    return 'likely'
  }

  // Possibly: some reports exist
  if (reportCount > 0) {
    return 'possibly'
  }

  return 'unknown'
}

/**
 * Calculate a 0-100 confidence score.
 */
function calculateConfidence(
  reportCount: number,
  agreementRatio: number,
  verifiedCount: number,
  stalenessSeconds: number,
  options: Required<ConsensusOptions>
): number {
  if (reportCount === 0) return 0

  let confidence = options.baseConfidence

  // Boost for strong agreement (up to +15)
  confidence += (agreementRatio - 0.5) * 30

  // Boost for multiple reports (up to +10)
  confidence += Math.min(reportCount - 1, 5) * 2

  // Boost for verified reports
  confidence += verifiedCount * options.verificationBoost

  // Penalty for staleness (linear decay)
  const stalenessPenalty = (stalenessSeconds / options.decaySeconds) * 30
  confidence -= stalenessPenalty

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(confidence)))
}
