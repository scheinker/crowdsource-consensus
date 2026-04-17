# crowdsource-consensus

Turn noisy crowdsourced reports into confidence-weighted status with graceful time decay.

## The Problem

You have users reporting binary status ("the swing is up", "parking is available", "the food truck is here"). Reports disagree. Reports get stale. How do you turn this into a single reliable status?

## The Solution

```ts
import { createConsensus, DECAY_PRESETS } from 'crowdsource-consensus'

const swing = createConsensus({
  decaySeconds: DECAY_PRESETS.daily, // 24 hours
})

// Users report what they see
swing.addReport({ status: 'up' })
swing.addReport({ status: 'up', verified: true }) // GPS-verified
swing.addReport({ status: 'down' })

// Get the consensus
const result = swing.getStatus()
// → {
//     status: 'likely_up',
//     rawStatus: 'up',
//     level: 'likely',
//     confidence: 78,
//     reportCount: 3,
//     verifiedCount: 1,
//     staleness: 42, // seconds since last report
//     lastReport: Date
//   }
```

## Installation

```bash
npm install crowdsource-consensus
```

## Core Concepts

### Status Levels

Reports are aggregated into four confidence levels:

| Level | Meaning |
|-------|---------|
| `confirmed` | Strong consensus + verified reports |
| `likely` | Good agreement or very recent |
| `possibly` | Some reports, but weak signal |
| `unknown` | No reports or all stale |

The final status is prefixed: `confirmed_up`, `likely_down`, `possibly_open`, etc.

### Time Decay

Old reports matter less than new ones. A report from an hour ago shouldn't count as much as one from 5 minutes ago.

Configure decay based on your domain:

```ts
import { DECAY_PRESETS } from 'crowdsource-consensus'

// Parking spots change fast
const parking = createConsensus({
  decaySeconds: DECAY_PRESETS.realtime, // 5 minutes
})

// Trail conditions change slowly
const trail = createConsensus({
  decaySeconds: DECAY_PRESETS.weekly, // 7 days
})
```

### Verification Boost

Verified reports (GPS location, photo proof, etc.) get a confidence boost:

```ts
consensus.addReport({ status: 'open', verified: true })
```

## API

### `createConsensus(options)`

Create a new consensus calculator.

```ts
const consensus = createConsensus({
  // Required: how long until reports fully decay
  decaySeconds: 3600,

  // Optional: confidence boost for verified reports (default: 15)
  verificationBoost: 15,

  // Optional: minimum reports for "confirmed" status (default: 2)
  confirmThreshold: 2,

  // Optional: minimum agreement ratio for strong consensus (default: 0.6)
  agreementThreshold: 0.6,

  // Optional: base confidence score (default: 70)
  baseConfidence: 70,

  // Optional: status string when no reports exist (default: "unknown")
  unknownStatus: 'unknown',
})
```

### `consensus.addReport(report)`

Add a report to the pool.

```ts
consensus.addReport({
  status: 'up',              // Required: any string
  timestamp: new Date(),     // Optional: defaults to now
  verified: false,           // Optional: verification flag
  weight: 1,                 // Optional: custom weight multiplier
})
```

### `consensus.addReports(reports)`

Add multiple reports at once.

```ts
consensus.addReports([
  { status: 'up' },
  { status: 'up', verified: true },
  { status: 'down' },
])
```

### `consensus.getStatus(now?)`

Calculate the current consensus.

```ts
const result = consensus.getStatus()
// {
//   status: 'likely_up',        // Full status string
//   rawStatus: 'up',            // Just the winning status
//   level: 'likely',            // Confidence level
//   confidence: 78,             // 0-100 score
//   reportCount: 3,             // Active reports
//   verifiedCount: 1,           // Verified reports
//   staleness: 42,              // Seconds since last report
//   lastReport: Date,           // Most recent report time
// }
```

### `consensus.clear()`

Remove all reports.

### `consensus.toJSON()`

Serialize the consensus state for persistence.

```ts
const snapshot = consensus.toJSON()
// {
//   reports: [{ status, timestamp, verified, weight }, ...],
//   savedAt: '2026-04-17T...',
//   version: '0.1.0'
// }
```

### Restoring from a snapshot

Pass a saved snapshot as the second argument to `createConsensus`:

```ts
const saved = JSON.parse(localStorage.getItem('swing'))
const consensus = createConsensus({ decaySeconds: 86400 }, saved)
```

### `calculateConsensus(reports, options, now?)`

Pure function version for one-off calculations:

```ts
import { calculateConsensus } from 'crowdsource-consensus'

const result = calculateConsensus(
  [
    { status: 'up', timestamp: new Date(), verified: false, weight: 1 },
    { status: 'up', timestamp: new Date(), verified: true, weight: 1 },
  ],
  {
    decaySeconds: 3600,
    verificationBoost: 15,
    confirmThreshold: 2,
    agreementThreshold: 0.6,
    baseConfidence: 70,
    unknownStatus: 'unknown',
  }
)
```

## Decay Presets

```ts
import { DECAY_PRESETS } from 'crowdsource-consensus'

DECAY_PRESETS.realtime   // 300 (5 min) - parking, bathrooms
DECAY_PRESETS.hourly     // 3600 (1 hr) - food trucks, pop-ups
DECAY_PRESETS.semiDaily  // 21600 (6 hr) - crowd levels
DECAY_PRESETS.daily      // 86400 (24 hr) - daily operations
DECAY_PRESETS.weekly     // 604800 (7 days) - trail conditions
```

## Use Cases

### Swing Status (the original)
```ts
const swing = createConsensus({ decaySeconds: DECAY_PRESETS.daily })
```

### Parking Availability
```ts
const parking = createConsensus({
  decaySeconds: DECAY_PRESETS.realtime,
  confirmThreshold: 3, // Need more reports to be sure
})
```

### Surf Conditions
```ts
const surf = createConsensus({
  decaySeconds: DECAY_PRESETS.hourly,
  verificationBoost: 20, // Photos are very valuable
})

surf.addReport({ status: 'pumping', verified: true }) // Photo proof
surf.addReport({ status: 'flat' })

surf.getStatus() // → { status: 'confirmed_pumping', ... }
```

### Food Truck Location
```ts
const truck = createConsensus({
  decaySeconds: DECAY_PRESETS.hourly,
})

truck.addReport({ status: 'at_ferry_building' })
```

### Trail Status
```ts
const trail = createConsensus({
  decaySeconds: DECAY_PRESETS.weekly,
  unknownStatus: 'check_conditions',
})
```

## Change Notifications

Get notified when the consensus status changes:

```ts
const swing = createConsensus({
  decaySeconds: DECAY_PRESETS.daily,
  onChange: (newStatus, prevStatus) => {
    console.log(`Status changed: ${prevStatus?.status} → ${newStatus.status}`)

    // Trigger webhook, update UI, send notification, etc.
    if (newStatus.level === 'confirmed') {
      sendPushNotification(`Swing is ${newStatus.rawStatus}!`)
    }
  }
})

swing.addReport({ status: 'up', verified: true })
// onChange fires: null → confirmed_up
```

The callback fires when `status` or `level` changes, not on every report.

## Persistence

Save and restore consensus state to survive restarts:

```ts
import { createConsensus, DECAY_PRESETS } from 'crowdsource-consensus'

// Create and populate
const swing = createConsensus({ decaySeconds: DECAY_PRESETS.daily })
swing.addReport({ status: 'up', verified: true })

// Save to any storage
const snapshot = swing.toJSON()
await redis.set('swing:consensus', JSON.stringify(snapshot))

// Later: restore from storage
const saved = JSON.parse(await redis.get('swing:consensus'))
const restored = createConsensus({ decaySeconds: DECAY_PRESETS.daily }, saved)

// Picks up where it left off
restored.getStatus() // { status: 'confirmed_up', ... }
```

Works with localStorage, Redis, PostgreSQL, S3, or any JSON-compatible storage.

## How It Works

1. **Filter**: Reports outside the decay window are ignored
2. **Weight**: Recent reports count more (linear decay)
3. **Aggregate**: Count weighted votes per status
4. **Boost**: Verified reports increase confidence
5. **Level**: Determine confidence level from vote patterns
6. **Score**: Calculate 0-100 confidence score

## License

MIT
