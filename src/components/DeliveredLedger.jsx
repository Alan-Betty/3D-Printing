import { useState, useMemo } from 'react'
import { calculateFilamentMetrics } from '../services/orderService'
import { STATUS_LOOKUP } from '../constants/production'

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const tsMillis = (s) => (s.created_at ? new Date(s.created_at).getTime() : Date.now())

function relTime(ts) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function DeliveredLedger({
  sales,
  onOpenOrder,
  onEditOrder,
  onRemoveOrder,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter delivered orders only
  const deliveredSales = useMemo(() => {
    return sales.filter((s) => s.production_status === 'delivered_completed')
  }, [sales])

  const total = useMemo(
    () => deliveredSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [deliveredSales]
  )
  const avg = useMemo(
    () => (deliveredSales.length ? total / deliveredSales.length : 0),
    [deliveredSales, total]
  )
  const best = useMemo(
    () => deliveredSales.reduce((max, s) => Math.max(max, Number(s.price) || 0), 0),
    [deliveredSales]
  )
  const zFill = useMemo(
    () => (best > 0 ? Math.min(100, Math.round((avg / best) * 100)) : 0),
    [avg, best]
  )
  const filamentMetrics = useMemo(
    () => calculateFilamentMetrics(deliveredSales),
    [deliveredSales]
  )

  // Filter by search query
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return deliveredSales
    return deliveredSales.filter(
      (s) =>
        (s.item || '').toLowerCase().includes(q) ||
        (s.customer || '').toLowerCase().includes(q) ||
        (s.customer_contact || '').toLowerCase().includes(q) ||
        (s.primary_color || '').toLowerCase().includes(q)
    )
  }, [deliveredSales, searchQuery])

  return (
    <section className="print-ledger-container" aria-label="Delivered print sales ledger">
      {/* Workshop Telemetry Deck */}
      <div className="telemetry-deck">
        <div className="telemetry-card">
          <div className="telemetry-label">
            <span>●</span> Total Delivered Revenue
          </div>
          <div className="telemetry-val teal">
            ₹{money(total)}
          </div>
          <div className="telemetry-sub">
            {deliveredSales.length} completed prints on build plate
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label">
            <span>🧵</span> Filament Consumed
          </div>
          <div className="telemetry-val accent">
            {filamentMetrics.totalGrams} <span style={{ fontSize: '18px', color: 'var(--muted-2)' }}>g</span>
          </div>
          <div className="telemetry-sub">
            {filamentMetrics.netGrams}g net + 10% misc ({filamentMetrics.miscGrams}g)
          </div>
        </div>

        {/* 3D Printer Z-Axis Build Height Visualizer */}
        <div className="telemetry-card">
          <div className="telemetry-label">
            <span>📐</span> Avg Sale · Build Height
          </div>
          <div className="z-visualizer-box">
            <div className="z-lead screw" style={{ width: '16px', height: '80px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-full)', border: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${zFill}%`,
                  background: 'linear-gradient(180deg, var(--teal), #00b4d8)',
                  boxShadow: '0 0 10px var(--teal-glow)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'height 0.6s ease',
                }}
              />
            </div>

            <div>
              <div className="telemetry-val" style={{ fontSize: '24px', margin: 0, color: 'var(--teal)' }}>
                ₹{money(avg)}
              </div>
              <div className="telemetry-sub" style={{ marginTop: '2px' }}>
                Z-fill: {zFill}% of max (₹{money(best)})
              </div>
            </div>
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label">
            <span>🏆</span> Top Single Layer
          </div>
          <div className="telemetry-val" style={{ color: 'var(--text-bright)' }}>
            ₹{money(best)}
          </div>
          <div className="telemetry-sub">Highest individual print record</div>
        </div>
      </div>

      {/* Search & Counter Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>
          Delivered Prints on Build Plate{' '}
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'normal', fontFamily: 'var(--font-mono)' }}>
            / {filteredSales.length} of {deliveredSales.length} completed
          </span>
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)' }}>
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter delivered item, customer, or color..."
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Interactive Layer Stack */}
      {filteredSales.length === 0 ? (
        <div className="table-wrapper" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🖨️</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-bright)' }}>No delivered print orders found</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', margin: 0 }}>
            {searchQuery
              ? 'No delivered orders matched your search query.'
              : 'Orders will appear here once they are marked as Completed in the Painting Dashboard.'}
          </p>
        </div>
      ) : (
        <div className="ledger-stack">
          {filteredSales.map((s, i) => {
            const idx = filteredSales.length - i
            const ts = tsMillis(s)
            const shots = s.images?.length || s.imageUrls?.length || 0
            const isExpress = s.priority === 'express' || s.print_type === 'express'

            return (
              <div
                key={s.id}
                className="layer-row"
                onClick={() => onOpenOrder(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenOrder(s)}
              >
                {/* Layer Index */}
                <div className="layer-idx" title={`Deposited Layer ${idx}`}>
                  L-{String(idx).padStart(2, '0')}
                </div>

                {/* Main Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-bright)' }}>
                      {s.item}
                    </span>
                    {s.qty > 1 && <span className="clean-qty-tag">×{s.qty}</span>}
                    {isExpress ? (
                      <span className="badge-prio express" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                        ⚡ Express
                      </span>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: 'var(--muted-2)' }}>Regular</span>
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--emerald)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      ● Completed
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text)' }}>👤 {s.customer}</span>

                    {s.weight_g != null && (
                      <>
                        <span>·</span>
                        <span title={`Net weight: ${s.weight_g}g + 10% misc overhead`}>
                          🧵 {s.weight_g}g{' '}
                          <span style={{ color: 'var(--accent)', fontSize: '11px' }}>
                            (+10%: {Math.round(Number(s.weight_g) * 1.1 * 10) / 10}g)
                          </span>
                        </span>
                      </>
                    )}

                    {shots > 0 && (
                      <>
                        <span>·</span>
                        <span>📷 {shots} photo{shots > 1 ? 's' : ''}</span>
                      </>
                    )}

                    {s.model_files?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>🧊 {s.model_files.length} file{s.model_files.length > 1 ? 's' : ''}</span>
                      </>
                    )}

                    {s.primary_color && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: s.primary_color_code || '#888',
                              display: 'inline-block',
                            }}
                          />
                          {s.primary_color}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price & Timestamp */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--teal)' }}>
                    ₹{money(s.price)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted-2)', fontFamily: 'var(--font-mono)' }}>
                    {relTime(ts)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-inspect"
                    onClick={() => onOpenOrder(s)}
                    title="Inspect order details"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => onEditOrder(s)}
                    title="Edit order specs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--danger-soft)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '12px',
                    }}
                    onClick={() => {
                      if (window.confirm(`Permanently delete delivered print "${s.item}" from ledger?`)) {
                        onRemoveOrder(s)
                      }
                    }}
                    title="Delete print from ledger"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
