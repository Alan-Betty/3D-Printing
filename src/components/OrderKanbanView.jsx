import { useState } from 'react'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { ColorSwatch } from './ColorSwatch'

export function OrderKanbanView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  const [draggedOrderId, setDraggedOrderId] = useState(null)
  const [activeDropColumn, setActiveDropColumn] = useState(null)

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedOrderId(orderId)
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId)
    }
  }

  const handleDragLeave = (e, colId) => {
    if (activeDropColumn === colId) {
      setActiveDropColumn(null)
    }
  }

  const handleDrop = (e, targetStatusId) => {
    e.preventDefault()
    setActiveDropColumn(null)
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId
    setDraggedOrderId(null)
    if (!orderId) return

    const targetOrder = orders.find((o) => o.id === orderId)
    if (targetOrder && targetOrder.production_status !== targetStatusId) {
      onStatusChange(targetOrder, targetStatusId)
    }
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-board" role="region" aria-label="Production stages kanban board">
        {PRODUCTION_STATUSES.map((col) => {
          const colOrders = orders.filter((o) => o.production_status === col.id)
          const colTotalValue = colOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0)
          const isOver = activeDropColumn === col.id

          return (
            <div
              key={col.id}
              className="kanban-column"
              style={{
                borderColor: isOver ? col.color : undefined,
                boxShadow: isOver ? `0 0 20px ${col.color}44` : undefined,
                transition: 'all 0.2s ease',
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="column-head" style={{ borderTopColor: col.color }}>
                <div className="column-title-row">
                  <div className="column-title-wrap">
                    <span className="column-dot" style={{ backgroundColor: col.color }} />
                    <span className="column-title">{col.label}</span>
                  </div>
                  <span className="column-count">{colOrders.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span className="column-desc">{col.desc}</span>
                  {colTotalValue > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>
                      ₹{colTotalValue.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Column Body with Cards */}
              <div className="column-body">
                {colOrders.length === 0 ? (
                  <div className="column-empty">
                    <span>Drop cards here</span>
                  </div>
                ) : (
                  colOrders.map((o) => {
                    const deadline = getDeliveryDeadlineInfo(o)
                    const isExpress = o.priority === 'express'
                    const colors = o.colors || []
                    const statusMeta = STATUS_LOOKUP[o.production_status] || col

                    const currentIdx = PRODUCTION_STATUSES.findIndex(
                      (s) => s.id === o.production_status
                    )
                    const nextStatus =
                      currentIdx < PRODUCTION_STATUSES.length - 1 &&
                      PRODUCTION_STATUSES[currentIdx + 1].step >= 0
                        ? PRODUCTION_STATUSES[currentIdx + 1]
                        : null

                    return (
                      <div
                        key={o.id}
                        className={`kanban-card ${isExpress ? 'card-express' : ''} ${deadline.isOverdue ? 'card-overdue' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, o.id)}
                        onClick={() => onOpenOrder(o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenOrder(o)}
                      >
                        {/* Top: ID & Priority */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="clean-id-pill" style={{ fontSize: '11px', padding: '1px 6px' }}>
                            #{o.id.slice(0, 7)}
                          </span>
                          {isExpress ? (
                            <span className="badge-prio express" style={{ fontSize: '10.5px', padding: '1px 7px' }}>
                              ⚡ Express
                            </span>
                          ) : (
                            <span style={{ fontSize: '10.5px', color: 'var(--muted-2)' }}>
                              Standard
                            </span>
                          )}
                        </div>

                        {/* Item Title & Qty */}
                        <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '14.5px', marginBottom: '4px' }}>
                          {o.item} {o.qty > 1 && <span className="clean-qty-tag">×{o.qty}</span>}
                        </div>

                        {/* Customer */}
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                          👤 {o.customer}
                        </div>

                        {/* Price & Weight Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-xs)', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--teal)' }}>
                            {Number(o.price || 0) > 0 ? `₹${Number(o.price).toLocaleString('en-IN')}` : 'Quote Pending'}
                          </span>
                          {o.weight_g != null && Number(o.weight_g) > 0 && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--accent)' }} title={`+10% misc: ${Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g`}>
                              🧵 {Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g
                            </span>
                          )}
                        </div>

                        {/* Swatches & Deadline */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {colors.length > 0 ? (
                              colors.slice(0, 2).map((c, i) => (
                                <ColorSwatch key={i} name={c.name} code={c.code} compact />
                              ))
                            ) : o.primary_color || o.primary_color_code ? (
                              <ColorSwatch name={o.primary_color} code={o.primary_color_code} compact />
                            ) : null}
                          </div>

                          {o.delivery_date && (
                            <span className={`clean-deadline-tag ${deadline.badgeClass}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {deadline.badgeText}
                            </span>
                          )}
                        </div>

                        {/* Compact Action Footer */}
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--line-dim)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-inspect"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onOpenOrder(o)}
                              title="Inspect full order"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              className="btn-edit"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onEditOrder(o)}
                              title="Edit order specs"
                            >
                              Edit
                            </button>
                            {onDeleteOrder && (
                              <button
                                type="button"
                                className="btn-delete"
                                style={{ padding: '3px 6px', fontSize: '11px' }}
                                onClick={(e) => {
                                  e.stopPropagation()
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

                          {nextStatus && (
                            <button
                              type="button"
                              className="card-advance-btn"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onStatusChange(o, nextStatus.id)}
                              title={`Advance to ${nextStatus.label}`}
                            >
                              → {nextStatus.label}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
