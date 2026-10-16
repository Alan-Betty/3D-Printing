import { WORKFLOW_STAGES, STATUS_LOOKUP } from '../constants/production'

export function ProgressIndicator({ status, compact = false }) {
  const current = STATUS_LOOKUP[status] || STATUS_LOOKUP.order_received

  if (status === 'on_hold') {
    return (
      <div className="progress-hold-banner">
        <span className="dot-hold" />
        <span>Production on hold</span>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="progress-cancelled-banner">
        <span className="dot-cancel" />
        <span>Order cancelled</span>
      </div>
    )
  }

  const currentStep = current.step >= 0 ? current.step : 0
  const totalSteps = WORKFLOW_STAGES.length // 7 steps (0 to 6)
  const pct = Math.round((currentStep / (totalSteps - 1)) * 100)

  if (compact) {
    return (
      <div className="progress-compact" title={`Status: ${current.label} (${pct}%)`}>
        <div className="progress-compact-bar">
          <div
            className="progress-compact-fill"
            style={{ width: `${pct}%`, backgroundColor: current.color }}
          />
        </div>
        <span className="progress-compact-label">{current.label}</span>
      </div>
    )
  }

  return (
    <div className="stepper-wrap" aria-label="Production progress">
      <div className="stepper-bar">
        <div
          className="stepper-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="stepper-nodes">
        {WORKFLOW_STAGES.map((s, idx) => {
          const isDone = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div
              key={s.id}
              className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}`}
            >
              <div className="stepper-circle">
                {isDone ? '✓' : idx + 1}
              </div>
              <div className="stepper-title">{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
