import { getDeliveryDeadlineInfo } from '../services/orderService'
import { STATUS_LOOKUP, WORKFLOW_STAGES } from '../constants/production'
import { ColorSwatch } from './ColorSwatch'

export function OrderCardView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  if (orders.length === 0) {
    return (
      <div className="table-wrapper" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
        <h3 style={{ margin: '0 0 6px', color: 'var(--text-bright)' }}>No orders match your criteria</h3>
        <p style={{ color: 'var(--muted)', fontSize: '13.5px', margin: 0 }}>
          Try clearing your active search query, timeframe, or priority filters.
        </p>
      </div>
    )
  }

  const formatShortId = (id) => (id ? `#${id.slice(0, 8)}` : '—')

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="cards-grid" aria-label="Order cards view">
      {orders.map((o) => {
        const deadline = getDeliveryDeadlineInfo(o)
        const statusMeta = STATUS_LOOKUP[o.production_status] || STATUS_LOOKUP.order_received
        const colors = o.colors || []
        const isExpress = o.priority === 'express'

        // Determine next workflow stage if applicable
        const currentStep = statusMeta.step
        const nextStage =
          currentStep >= 0 && currentStep < WORKFLOW_STAGES.length - 1
            ? WORKFLOW_STAGES[currentStep + 1]
            : null

        // Step percentage for mini-stepper (0% to 100%)
        const pct = Math.max(15, Math.min(100, Math.round(((Math.max(0, currentStep) + 1) / WORKFLOW_STAGES.length) * 100)))

        return (
          <div
            key={o.id}
            className={`order-card ${isExpress ? 'card-express' : ''} ${deadline.isOverdue ? 'card-overdue' : ''}`}
            onClick={() => onOpenOrder(o)}
          >
            {/* Top Bar: ID, Date, Priority */}
            <div className="card-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="card-id-tag" title={o.id}>{formatShortId(o.id)}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {isExpress ? (
                <span className="badge-prio express">⚡ Express</span>
              ) : (
                <span className="badge-prio standard">Standard</span>
              )}
            </div>

            {/* Title & Customer */}
            <h3 className="card-title" title={o.item}>
              <span>{o.item}</span>
              {o.qty > 1 && <span className="clean-qty-tag">×{o.qty}</span>}
            </h3>

            <div className="card-customer-row">
              <div className="customer-avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                {getInitials(o.customer)}
              </div>
              <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{o.customer}</span>
              {o.customer_contact && (
                <span style={{ fontSize: '11.5px', color: 'var(--muted-2)' }}>· {o.customer_contact}</span>
              )}
            </div>

            {/* Metrics Strip: Price & Filament */}
            <div className="card-metrics-strip">
              <div className="card-metric-block">
                <span className="card-metric-label">Price</span>
                <span className="card-metric-val price">
                  {Number(o.price || 0) > 0 ? (
                    `₹${Number(o.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  ) : (
                    <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '12px' }}>Pending</span>
                  )}
                </span>
              </div>

              <div className="card-metric-block">
                <span className="card-metric-label">Filament (+10% Misc)</span>
                <span className="card-metric-val weight">
                  {o.weight_g != null && Number(o.weight_g) > 0 ? (
                    `🧵 ${Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g`
                  ) : (
                    <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '12px' }}>Pending</span>
                  )}
                </span>
              </div>
            </div>

            {/* Paint Swatches & Deadline */}
            <div className="card-color-row">
              <div className="card-swatches-wrap">
                {colors.length > 0 ? (
                  colors.slice(0, 3).map((c, i) => (
                    <ColorSwatch
                      key={i}
                      name={c.name}
                      code={c.code}
                      finish={c.finish}
                      paintType={c.paint_type}
                      role={c.role}
                      compact
                    />
                  ))
                ) : o.primary_color || o.primary_color_code ? (
                  <ColorSwatch
                    name={o.primary_color}
                    code={o.primary_color_code}
                    finish={o.finish}
                    paintType={o.paint_type}
                    role="Primary"
                    compact
                  />
                ) : (
                  <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', fontStyle: 'italic' }}>
                    Standard Primer
                  </span>
                )}
                {o.finish && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>
                    ({o.finish})
                  </span>
                )}
              </div>

              {o.delivery_date && (
                <span className={`clean-deadline-tag ${deadline.badgeClass}`}>
                  {deadline.badgeText}
                </span>
              )}
            </div>

            {/* Mini Progress Stepper */}
            <div className="mini-stepper">
              <div className="mini-stepper-bar">
                <div
                  className="mini-stepper-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: statusMeta.color || 'var(--accent)',
                  }}
                />
              </div>
              <div className="mini-stepper-label">
                <span style={{ color: statusMeta.color, fontWeight: 600 }}>
                  ● {statusMeta.label}
                </span>
                <span>{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'No date'}</span>
              </div>
            </div>

            {/* Footer Quick Actions */}
            <div className="card-footer" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-inspect"
                  onClick={() => onOpenOrder(o)}
                  title="Inspect order details"
                >
                  Inspect
                </button>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => onEditOrder(o)}
                  title="Edit order specs"
                >
                  Edit
                </button>
                {onDeleteOrder && (
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => {
                      if (window.confirm(`Permanently delete order #${o.id.slice(0, 8)} ("${o.item}") from production queue?`)) {
                        onDeleteOrder(o)
                      }
                    }}
                    title="Delete order"
                    aria-label={`Delete order ${o.item}`}
                  >
                    🗑️
                  </button>
                )}
              </div>

              {nextStage ? (
                <button
                  type="button"
                  className="card-advance-btn"
                  onClick={() => onStatusChange(o, nextStage.id)}
                  title={`Advance order to ${nextStage.label}`}
                >
                  <span>Advance →</span>
                </button>
              ) : (
                <span style={{ fontSize: '11.5px', color: 'var(--emerald)', fontWeight: 600 }}>
                  ✓ Fulfilled
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
