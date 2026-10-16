import { useState } from 'react'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { ColorSwatch } from './ColorSwatch'

export function OrderTableView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  const [copiedId, setCopiedId] = useState(null)

  const handleCopyId = (e, id) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (e, o) => {
    e.stopPropagation()
    if (window.confirm(`Permanently delete order #${o.id.slice(0, 8)} ("${o.item}") from production queue?`)) {
      onDeleteOrder?.(o)
    }
  }

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

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const formatShortId = (id) => (id ? `#${id.slice(0, 8)}` : '—')

  return (
    <div className="table-wrapper">
      <table className="clean-table" aria-label="Production queue orders">
        <thead>
          <tr>
            <th style={{ width: '125px' }}>Order ID</th>
            <th style={{ minWidth: '170px' }}>Customer</th>
            <th style={{ minWidth: '200px' }}>Item &amp; Pricing</th>
            <th style={{ width: '115px' }}>Priority</th>
            <th style={{ minWidth: '155px' }}>Delivery Deadline</th>
            <th style={{ minWidth: '180px' }}>Paint Colours &amp; Finish</th>
            <th style={{ minWidth: '180px' }}>Production Status</th>
            <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const deadline = getDeliveryDeadlineInfo(o)
            const statusMeta = STATUS_LOOKUP[o.production_status] || STATUS_LOOKUP.order_received
            const colors = o.colors || []
            const isExpress = o.priority === 'express'
            const isCopied = copiedId === o.id

            return (
              <tr
                key={o.id}
                className={`clean-row ${isExpress ? 'clean-row-express' : ''} ${deadline.isOverdue ? 'clean-row-overdue' : ''}`}
                onClick={() => onOpenOrder(o)}
              >
                {/* Order ID with Click-to-Copy */}
                <td>
                  <button
                    type="button"
                    className="clean-id-pill"
                    onClick={(e) => handleCopyId(e, o.id)}
                    title="Click to copy full Order ID"
                  >
                    {isCopied ? '✓ Copied' : formatShortId(o.id)}
                  </button>
                  <span className="clean-id-date">
                    {new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </td>

                {/* Customer with Avatar Initial */}
                <td>
                  <div className="cell-customer-wrap">
                    <div className="customer-avatar">
                      {getInitials(o.customer)}
                    </div>
                    <div>
                      <div className="clean-cust-name">{o.customer}</div>
                      {o.customer_contact ? (
                        <div className="clean-cust-contact">{o.customer_contact}</div>
                      ) : (
                        <div className="clean-cust-contact" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                          No phone/email
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Item & Financials */}
                <td>
                  <div className="clean-item-title">
                    <span>{o.item}</span>
                    {o.qty > 1 && <span className="clean-qty-tag">×{o.qty}</span>}
                  </div>
                  <div className="clean-item-sub">
                    {Number(o.price || 0) > 0 ? (
                      <span className="clean-price">
                        ₹{Number(o.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '12px' }}>
                        Price Pending
                      </span>
                    )}

                    {o.weight_g != null && Number(o.weight_g) > 0 ? (
                      <span
                        className="clean-weight"
                        title={`Net weight: ${o.weight_g}g + 10% misc overhead: ${Math.round(Number(o.weight_g) * 0.1 * 10) / 10}g`}
                      >
                        · 🧵 {Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g
                        <span className="clean-weight-misc"> (+10%)</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '11px' }}>
                        · Weight Pending
                      </span>
                    )}
                  </div>
                </td>

                {/* Priority */}
                <td>
                  {isExpress ? (
                    <span className="badge-prio express" title="Express Queue Priority">
                      ⚡ Express
                    </span>
                  ) : (
                    <span className="badge-prio standard" title="Standard Queue Priority">
                      Standard
                    </span>
                  )}
                </td>

                {/* Delivery Deadline */}
                <td>
                  {o.delivery_date ? (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-bright)' }}>
                        {new Date(o.delivery_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <span className={`clean-deadline-tag ${deadline.badgeClass}`}>
                        {deadline.badgeText}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '12px' }}>
                      Unscheduled
                    </span>
                  )}
                </td>

                {/* Paint Colours & Finish */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {colors.length > 0 ? (
                      colors.map((c, i) => (
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
                      <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '12px' }}>
                        Standard primer
                      </span>
                    )}
                  </div>
                  {o.finish && (
                    <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px', display: 'inline-block' }}>
                      {o.finish} finish
                    </span>
                  )}
                </td>

                {/* Production Status Selector */}
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="status-dropdown-wrapper">
                    <span
                      className="status-dropdown-dot"
                      style={{ backgroundColor: statusMeta.color }}
                    />
                    <select
                      className="status-dropdown-select"
                      value={o.production_status}
                      aria-label="Update production status"
                      onChange={(e) => onStatusChange(o, e.target.value)}
                      style={{ color: statusMeta.color }}
                    >
                      {PRODUCTION_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <span className="status-dropdown-chevron" aria-hidden="true">▾</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="action-btn-group">
                    <button
                      type="button"
                      className="btn-inspect"
                      onClick={() => onOpenOrder(o)}
                      title="Inspect full details, photos & CAD models"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => onEditOrder(o)}
                      title="Edit order specs and files"
                    >
                      Edit
                    </button>
                    {onDeleteOrder && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={(e) => handleDelete(e, o)}
                        title="Delete order"
                        aria-label={`Delete order ${o.item}`}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
