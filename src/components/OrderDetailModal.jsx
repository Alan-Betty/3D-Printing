import { useEffect, useState } from 'react'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { fetchOrderHistory } from '../services/historyService'
import { ColorSwatch } from './ColorSwatch'
import { ProgressIndicator } from './ProgressIndicator'

export function OrderDetailModal({
  order,
  user,
  onClose,
  onEditOrder,
  onStatusChange,
  onRemoveOrder,
}) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'status' | 'history' | 'files'
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(order?.production_status || 'order_received')
  const [statusNote, setStatusNote] = useState('')
  const [activePhoto, setActivePhoto] = useState(order?.imageUrls?.[0] || null)

  const deadline = getDeliveryDeadlineInfo(order)
  const statusMeta = STATUS_LOOKUP[order.production_status] || STATUS_LOOKUP.order_received
  const isExpress = order.priority === 'express'
  const colors = order.colors || []
  const photos = order.imageUrls || []
  const modelFiles = order.modelFiles || []

  // Load chronological history when opened
  useEffect(() => {
    if (!order?.id) return
    setLoadingHistory(true)
    fetchOrderHistory(order.id)
      .then((entries) => setHistory(entries))
      .catch((err) => console.warn('Could not load history:', err))
      .finally(() => setLoadingHistory(false))
  }, [order?.id, order?.production_status])

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault()
    if (selectedStatus === order.production_status && !statusNote.trim()) return
    await onStatusChange(order, selectedStatus, statusNote.trim())
    setStatusNote('')
  }

  const formatDateTime = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const weightNum = Number(order.weight_g)
  const hasValidWeight = order.weight_g != null && !Number.isNaN(weightNum) && weightNum > 0

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="sheet sheet-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-order-title"
      >
        {/* Fixed Header */}
        <div className="sheet-head">
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan)' }}>
              Order ID: #{order.id}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>
              Placed: {formatDateTime(order.created_at)}
            </span>
            {isExpress ? (
              <span className="badge-prio express">⚡ Express Priority</span>
            ) : (
              <span className="badge-prio standard">Standard Priority</span>
            )}
          </div>
          <h2 id="modal-order-title" className="sheet-title" style={{ fontSize: '22px', marginTop: '2px' }}>
            {order.item} {order.qty > 1 && <span className="clean-qty-tag">×{order.qty}</span>}
          </h2>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 Overview &amp; Specs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'status'}
            className={`modal-tab ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            🔄 Production Tracker
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 Activity History ({history.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'files'}
            className={`modal-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📁 Files &amp; Photos ({photos.length + modelFiles.length})
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="sheet-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Delivery Deadline Alert Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line-light)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📅</span>
                  <div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
                      Expected Delivery Target
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-bright)' }}>
                      {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'No delivery date assigned'}
                    </div>
                  </div>
                </div>

                <span className={`clean-deadline-tag ${deadline.badgeClass}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
                  {deadline.badgeText}
                </span>
              </div>

              {/* Order Information Grid */}
              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-bright)' }}>
                  Order &amp; Customer Specs
                </h3>

                <div className="form-grid-3">
                  <div className="card-metric-block">
                    <span className="card-metric-label">Customer Name</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '4px' }}>
                      {order.customer}
                    </span>
                  </div>

                  <div className="card-metric-block">
                    <span className="card-metric-label">Customer Contact</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
                      {order.customer_contact || 'None provided'}
                    </span>
                  </div>

                  <div className="card-metric-block">
                    <span className="card-metric-label">Quantity</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '4px' }}>
                      {order.qty || 1} pcs
                    </span>
                  </div>

                  <div className="card-metric-block">
                    <span className="card-metric-label">Price Charged</span>
                    <span className="card-metric-val price" style={{ marginTop: '4px' }}>
                      {Number(order.price || 0) > 0 ? (
                        `₹${Number(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '13px' }}>Pending Quote</span>
                      )}
                    </span>
                  </div>

                  <div className="card-metric-block">
                    <span className="card-metric-label">Filament Used (+10% Misc)</span>
                    <span className="card-metric-val weight" style={{ marginTop: '4px' }}>
                      {hasValidWeight ? (
                        <span>
                          {Math.round(weightNum * 1.1 * 10) / 10}g{' '}
                          <span style={{ fontSize: '11px', color: 'var(--muted-2)', fontWeight: 'normal' }}>
                            ({weightNum}g net + {Math.round(weightNum * 0.1 * 10) / 10}g misc)
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '13px' }}>Pending Weight</span>
                      )}
                    </span>
                  </div>

                  <div className="card-metric-block">
                    <span className="card-metric-label">Current Pipeline Status</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: statusMeta.color, marginTop: '4px' }}>
                      ● {statusMeta.label}
                    </span>
                  </div>
                </div>

                {order.description && (
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line-dim)' }}>
                    <div className="card-metric-label">Order Notes / Description</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text)', marginTop: '4px', background: 'var(--bg-deep)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                      {order.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Paint & Finishing Specifications */}
              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-bright)' }}>
                  Paint Colours &amp; Surface Specifications
                </h3>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {colors.length > 0 ? (
                    colors.map((c, i) => (
                      <ColorSwatch
                        key={i}
                        name={c.name}
                        code={c.code}
                        finish={c.finish}
                        paintType={c.paint_type}
                        role={c.role || `Colour #${i + 1}`}
                      />
                    ))
                  ) : order.primary_color || order.primary_color_code ? (
                    <>
                      <ColorSwatch
                        name={order.primary_color}
                        code={order.primary_color_code}
                        finish={order.finish}
                        paintType={order.paint_type}
                        role="Primary Colour"
                      />
                      {(order.secondary_color || order.secondary_color_code) && (
                        <ColorSwatch
                          name={order.secondary_color}
                          code={order.secondary_color_code}
                          finish={order.finish}
                          paintType={order.paint_type}
                          role="Secondary Colour"
                        />
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'var(--muted-2)', fontStyle: 'italic', fontSize: '13px' }}>
                      Standard primer finish. No custom paint specified.
                    </div>
                  )}
                </div>

                <div className="form-grid-2" style={{ paddingTop: '14px', borderTop: '1px solid var(--line-dim)' }}>
                  <div>
                    <span className="card-metric-label">Paint Chemistry</span>
                    <div style={{ fontSize: '14px', color: 'var(--text-bright)', marginTop: '3px' }}>
                      {order.paint_type || 'Unspecified'}
                    </div>
                  </div>
                  <div>
                    <span className="card-metric-label">Surface Finish</span>
                    <div style={{ fontSize: '14px', color: 'var(--text-bright)', marginTop: '3px' }}>
                      {order.finish || 'Standard'}
                    </div>
                  </div>
                </div>

                {order.special_instructions && (
                  <div style={{ marginTop: '14px', background: 'rgba(255, 94, 30, 0.08)', border: '1px solid rgba(255, 94, 30, 0.25)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                      SPECIAL PAINTING INSTRUCTIONS
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-bright)', marginTop: '3px' }}>
                      {order.special_instructions}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTION TRACKER */}
          {activeTab === 'status' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--text-bright)' }}>
                  Workflow Pipeline Progress
                </h3>
                <ProgressIndicator status={order.production_status} />
              </div>

              <div className="form-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--text-bright)' }}>
                  Advance / Shift Production Stage
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--muted)' }}>
                  Selecting a stage updates live workshop telemetry, moves the order in the Kanban queue, and records a verified change entry.
                </p>

                <form onSubmit={handleUpdateStatusSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    {PRODUCTION_STATUSES.map((s) => {
                      const isSelected = selectedStatus === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStatus(s.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'var(--panel-elevated)' : 'var(--bg-deep)',
                            border: `1px solid ${isSelected ? s.color : 'var(--line)'}`,
                            boxShadow: isSelected ? `0 0 15px ${s.color}33` : 'none',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color, marginTop: '4px', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? 'var(--text-bright)' : 'var(--text)' }}>
                              {s.label}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted-2)', marginTop: '2px' }}>
                              {s.desc}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" htmlFor="status-note-input">
                      Operator Note / Rationale (Optional)
                    </label>
                    <input
                      id="status-note-input"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Completed surface priming; transferred to main paint booth"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={selectedStatus === order.production_status && !statusNote.trim()}
                  >
                    Confirm Stage Update →
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div className="form-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--text-bright)' }}>
                Accountability &amp; Activity Log
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--muted)' }}>
                Audit trail of changes made to this order by studio operators.
              </p>

              {loadingHistory ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading history…
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted-2)' }}>
                  No logged changes yet for this order.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {history.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>
                          {h.field_changed === 'production_status'
                            ? 'Production Status Changed'
                            : `Updated ${h.field_changed}`}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                          {formatDateTime(h.created_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                        {h.old_value && <span style={{ color: 'var(--muted)' }}>From: <em>{h.old_value}</em> → </span>}
                        <span>To: <strong style={{ color: 'var(--text-bright)' }}>{h.new_value}</strong></span>
                      </div>

                      {h.notes && (
                        <div style={{ fontSize: '12px', color: 'var(--teal)', fontStyle: 'italic', marginTop: '2px' }}>
                          "{h.notes}"
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: 'var(--muted-2)', marginTop: '2px' }}>
                        Operator: <strong style={{ color: 'var(--text)' }}>{h.changed_by || 'Studio Operator'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FILES & PHOTOS */}
          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Photos Gallery */}
              <div className="form-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-bright)' }}>
                    Finished Product Documentation Photos ({photos.length})
                  </h3>
                  <button
                    type="button"
                    style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: 600 }}
                    onClick={() => {
                      onClose()
                      onEditOrder(order)
                    }}
                  >
                    ✏️ Upload / Edit Photos
                  </button>
                </div>

                {photos.length > 0 ? (
                  <div>
                    <div style={{ width: '100%', maxHeight: '380px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <img
                        src={activePhoto || photos[0]}
                        alt={order.item}
                        style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }}
                      />
                    </div>
                    {photos.length > 1 && (
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                        {photos.map((u, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActivePhoto(u)}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              border: `2px solid ${activePhoto === u ? 'var(--accent)' : 'transparent'}`,
                              flexShrink: 0,
                            }}
                          >
                            <img src={u} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted-2)' }}>
                    No finished product photos attached.
                  </div>
                )}
              </div>

              {/* 3D CAD Models */}
              <div className="form-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-bright)' }}>
                    3D CAD &amp; Slicer Model Files ({modelFiles.length})
                  </h3>
                  <button
                    type="button"
                    style={{ fontSize: '12.5px', color: 'var(--cyan)', fontWeight: 600 }}
                    onClick={() => {
                      onClose()
                      onEditOrder(order)
                    }}
                  >
                    📁 Manage 3D Files
                  </button>
                </div>

                {modelFiles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modelFiles.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--bg-deep)',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span style={{ fontSize: '13.5px', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🧊</span> {m.name}
                        </span>
                        {m.url && (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="btn-inspect"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Download / View ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted-2)' }}>
                    No 3D CAD models attached.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Guaranteed Sticky Action Footer */}
        <div className="sheet-foot">
          <button
            type="button"
            className="del-btn"
            onClick={() => {
              if (window.confirm(`Permanently remove order for "${order.item}" from the studio ledger?`)) {
                onRemoveOrder(order)
              }
            }}
          >
            🗑️ Delete Order
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onEditOrder(order)}
          >
            ✏️ Edit Order Specifications
          </button>
        </div>
      </div>
    </div>
  )
}
