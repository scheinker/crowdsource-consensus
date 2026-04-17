# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-04-17

### Added
- `onChange` callback option - fires when consensus status changes after adding reports
- Useful for triggering notifications, webhooks, or real-time UI updates

### Example
```ts
const swing = createConsensus({
  decaySeconds: 86400,
  onChange: (newStatus, prevStatus) => {
    if (newStatus.rawStatus !== prevStatus?.rawStatus) {
      sendWebhook({ status: newStatus.rawStatus })
    }
  }
})
```

## [0.2.0] - 2026-04-17

### Added
- `toJSON()` method for serializing consensus state
- Restore from snapshot via `createConsensus(options, snapshot)`
- Full JSDoc comments for better IDE experience
- `Consensus` interface export
- `ConsensusSnapshot` type export

## [0.1.0] - 2026-04-17

### Added
- Initial release
- `createConsensus()` factory function
- `calculateConsensus()` pure function
- Configurable decay windows via `decaySeconds`
- `DECAY_PRESETS` for common scenarios (realtime, hourly, daily, weekly)
- Verification boost for GPS/photo-verified reports
- Four confidence levels: confirmed, likely, possibly, unknown
- Weighted voting favoring recent reports
- 20 passing tests
