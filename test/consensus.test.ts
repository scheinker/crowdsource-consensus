import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createConsensus, calculateConsensus, DECAY_PRESETS } from '../src/index'

describe('createConsensus', () => {
  it('returns unknown when no reports', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    const result = consensus.getStatus()

    assert.strictEqual(result.status, 'unknown')
    assert.strictEqual(result.level, 'unknown')
    assert.strictEqual(result.confidence, 0)
    assert.strictEqual(result.reportCount, 0)
  })

  it('returns likely status with single recent report', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'up' })
    const result = consensus.getStatus()

    assert.strictEqual(result.rawStatus, 'up')
    // Single very recent report is "likely" due to recency boost
    assert.strictEqual(result.level, 'likely')
    assert.ok(result.confidence > 0)
    assert.strictEqual(result.reportCount, 1)
  })

  it('returns confirmed status with multiple verified reports', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'up', verified: true })
    consensus.addReport({ status: 'up', verified: true })
    const result = consensus.getStatus()

    assert.strictEqual(result.status, 'confirmed_up')
    assert.strictEqual(result.level, 'confirmed')
    assert.strictEqual(result.verifiedCount, 2)
  })

  it('returns likely status with agreement but no verification', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'down' })
    consensus.addReport({ status: 'down' })
    consensus.addReport({ status: 'up' })
    const result = consensus.getStatus()

    assert.strictEqual(result.status, 'likely_down')
    assert.strictEqual(result.rawStatus, 'down')
    assert.strictEqual(result.level, 'likely')
  })

  it('handles mixed reports with majority winning', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'open' })
    consensus.addReport({ status: 'open' })
    consensus.addReport({ status: 'open' })
    consensus.addReport({ status: 'closed' })
    const result = consensus.getStatus()

    assert.strictEqual(result.rawStatus, 'open')
    assert.ok(result.confidence > 50)
  })

  it('works with custom status values', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'pumping' })
    consensus.addReport({ status: 'pumping', verified: true })
    const result = consensus.getStatus()

    assert.strictEqual(result.status, 'confirmed_pumping')
  })

  it('clears reports', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: 'up' })
    consensus.addReport({ status: 'up' })
    assert.strictEqual(consensus.reportCount, 2)

    consensus.clear()
    assert.strictEqual(consensus.reportCount, 0)
    assert.strictEqual(consensus.getStatus().status, 'unknown')
  })
})

describe('decay behavior', () => {
  it('ignores reports outside decay window', () => {
    const consensus = createConsensus({ decaySeconds: 3600 }) // 1 hour
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

    consensus.addReport({ status: 'up', timestamp: twoHoursAgo })
    const result = consensus.getStatus()

    assert.strictEqual(result.status, 'unknown')
    assert.strictEqual(result.reportCount, 0)
  })

  it('weights recent reports higher than old ones', () => {
    const now = new Date()
    const consensus = createConsensus({ decaySeconds: 3600 })

    // Old report says down
    const oldTime = new Date(now.getTime() - 50 * 60 * 1000) // 50 min ago
    consensus.addReport({ status: 'down', timestamp: oldTime })

    // Recent report says up
    const recentTime = new Date(now.getTime() - 5 * 60 * 1000) // 5 min ago
    consensus.addReport({ status: 'up', timestamp: recentTime })

    const result = consensus.getStatus(now)

    // Recent "up" should win due to decay weighting
    assert.strictEqual(result.rawStatus, 'up')
  })

  it('calculates staleness correctly', () => {
    const now = new Date()
    const consensus = createConsensus({ decaySeconds: 3600 })

    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
    consensus.addReport({ status: 'up', timestamp: tenMinutesAgo })

    const result = consensus.getStatus(now)

    // Staleness should be ~600 seconds (10 minutes)
    assert.ok(result.staleness >= 590 && result.staleness <= 610)
  })
})

describe('confidence scoring', () => {
  it('boosts confidence for verified reports', () => {
    const consensus1 = createConsensus({ decaySeconds: 3600 })
    consensus1.addReport({ status: 'up' })
    consensus1.addReport({ status: 'up' })

    const consensus2 = createConsensus({ decaySeconds: 3600 })
    consensus2.addReport({ status: 'up', verified: true })
    consensus2.addReport({ status: 'up', verified: true })

    const unverified = consensus1.getStatus()
    const verified = consensus2.getStatus()

    assert.ok(verified.confidence > unverified.confidence)
  })

  it('reduces confidence for stale reports', () => {
    const now = new Date()
    const consensus = createConsensus({ decaySeconds: 3600 })

    // Add report from 30 minutes ago
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
    consensus.addReport({ status: 'up', timestamp: thirtyMinAgo })
    consensus.addReport({ status: 'up', timestamp: thirtyMinAgo })
    const staleResult = consensus.getStatus(now)

    // Add fresh report
    consensus.addReport({ status: 'up', timestamp: now })
    const freshResult = consensus.getStatus(now)

    assert.ok(freshResult.confidence > staleResult.confidence)
  })

  it('boosts confidence for strong agreement', () => {
    const unanimousConsensus = createConsensus({ decaySeconds: 3600 })
    unanimousConsensus.addReport({ status: 'up' })
    unanimousConsensus.addReport({ status: 'up' })
    unanimousConsensus.addReport({ status: 'up' })

    const splitConsensus = createConsensus({ decaySeconds: 3600 })
    splitConsensus.addReport({ status: 'up' })
    splitConsensus.addReport({ status: 'up' })
    splitConsensus.addReport({ status: 'down' })

    const unanimous = unanimousConsensus.getStatus()
    const split = splitConsensus.getStatus()

    assert.ok(unanimous.confidence > split.confidence)
  })
})

describe('presets', () => {
  it('provides sensible decay presets', () => {
    assert.strictEqual(DECAY_PRESETS.realtime, 300)
    assert.strictEqual(DECAY_PRESETS.hourly, 3600)
    assert.strictEqual(DECAY_PRESETS.daily, 86400)
    assert.strictEqual(DECAY_PRESETS.weekly, 604800)
  })

  it('works with realtime preset for parking', () => {
    const parking = createConsensus({ decaySeconds: DECAY_PRESETS.realtime })
    parking.addReport({ status: 'available' })
    parking.addReport({ status: 'available', verified: true })

    const result = parking.getStatus()
    assert.strictEqual(result.status, 'confirmed_available')
  })
})

describe('edge cases', () => {
  it('handles empty status string', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReport({ status: '' })
    const result = consensus.getStatus()

    assert.strictEqual(result.rawStatus, '')
    assert.strictEqual(result.reportCount, 1)
  })

  it('handles future timestamps gracefully', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    const future = new Date(Date.now() + 60000) // 1 minute in future

    consensus.addReport({ status: 'up', timestamp: future })
    const result = consensus.getStatus()

    // Future reports should be ignored
    assert.strictEqual(result.reportCount, 0)
  })

  it('handles exact decay boundary', () => {
    const now = new Date()
    const consensus = createConsensus({ decaySeconds: 3600 })

    // Report exactly at decay boundary
    const exactBoundary = new Date(now.getTime() - 3600 * 1000)
    consensus.addReport({ status: 'up', timestamp: exactBoundary })

    const result = consensus.getStatus(now)

    // Should be excluded (at or beyond boundary)
    assert.strictEqual(result.reportCount, 0)
  })

  it('handles addReports batch method', () => {
    const consensus = createConsensus({ decaySeconds: 3600 })
    consensus.addReports([
      { status: 'up' },
      { status: 'up' },
      { status: 'down' },
    ])

    assert.strictEqual(consensus.reportCount, 3)
    assert.strictEqual(consensus.getStatus().rawStatus, 'up')
  })

  it('respects custom unknownStatus', () => {
    const consensus = createConsensus({
      decaySeconds: 3600,
      unknownStatus: 'no_data',
    })

    const result = consensus.getStatus()
    assert.strictEqual(result.status, 'no_data')
  })
})
