import { useState } from 'react'

export function AlertBanner({ warnings, onFilterWarning }) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!warnings || warnings.length === 0 || dismissed) return null

  // Priority warning (overdue first, then express, then today, then unstarted, then ready)
  const primaryWarning =
    warnings.find((w) => w.type === 'critical') ||
    warnings.find((w) => w.type === 'urgent') ||
    warnings[0]

  return (
    <div className="alert-strip" role="alert" aria-label="Actionable deadline warnings">
      <div className="alert-strip-main">
        <div className="alert-strip-summary">
          <span className="alert-pulse-icon" aria-hidden="true">
            {primaryWarning.type === 'critical' ? '⚠️' : primaryWarning.type === 'urgent' ? '⚡' : '🔔'}
          </span>
          <span className="alert-strip-headline">
            <strong>Attention Required:</strong> {primaryWarning.title} — {primaryWarning.message}
          </span>
        </div>

        <div className="alert-strip-pills">
          {warnings.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`alert-mini-pill alert-mini-${w.type}`}
              onClick={() => onFilterWarning(w.filterKey)}
              title={w.message}
            >
              <span>{w.type === 'critical' ? '⚠️' : w.type === 'urgent' ? '⚡' : '•'}</span>
              <span>{w.title}</span>
            </button>
          ))}
        </div>

        <div className="alert-strip-actions">
          <button
            type="button"
            className="alert-btn-action"
            onClick={() => onFilterWarning(primaryWarning.filterKey)}
          >
            Filter Queue →
          </button>
          <button
            type="button"
            className="alert-btn-close"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss warnings"
            title="Dismiss this notification strip"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
