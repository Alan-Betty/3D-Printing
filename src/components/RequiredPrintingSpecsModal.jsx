import { useState } from 'react'
import { STATUS_LOOKUP } from '../constants/production'

/**
 * RequiredPrintingSpecsModal
 * Displayed when an order is transitioned to Printing (or beyond)
 * if Price and/or Print Weight were not yet provided during intake.
 */
export function RequiredPrintingSpecsModal({
  order,
  targetStatus,
  onConfirm,
  onCancel,
}) {
  const [price, setPrice] = useState(
    order?.price != null && Number(order.price) > 0 ? String(order.price) : ''
  )
  const [weightG, setWeightG] = useState(
    order?.weight_g != null && Number(order.weight_g) > 0
      ? String(order.weight_g)
      : ''
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [touched, setTouched] = useState(false)

  const targetLabel = STATUS_LOOKUP[targetStatus]?.label || 'Printing'

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    setErrorMsg('')

    const priceNum = Number(price)
    const weightNum = Number(weightG)

    if (price === '' || Number.isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Price (₹) is mandatory starting from Printing (must be > ₹0).')
      return
    }

    if (weightG === '' || Number.isNaN(weightNum) || weightNum <= 0) {
      setErrorMsg('Print Weight (g) is mandatory starting from Printing (must be > 0g).')
      return
    }

    onConfirm({
      price: priceNum,
      weight_g: weightNum,
    })
  }

  const weightNum = Number(weightG)
  const hasValidWeight = !Number.isNaN(weightNum) && weightNum > 0
  const miscOverhead = hasValidWeight ? Math.round(weightNum * 0.1 * 10) / 10 : 0
  const totalFilament = hasValidWeight ? Math.round(weightNum * 1.1 * 10) / 10 : 0

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-modal-title"
      onClick={onCancel}
    >
      <div
        className="sheet required-specs-modal"
        style={{ maxWidth: '480px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sheet-x"
          onClick={onCancel}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="required-specs-header">
          <div
            className="specs-stage-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '4px 10px',
              borderRadius: '999px',
              marginBottom: '12px',
            }}
          >
            <span>🖨️</span> Advancing to {targetLabel}
          </div>
          <h2 id="specs-modal-title" className="sheet-title" style={{ fontSize: '19px' }}>
            Printing Specifications Required
          </h2>
          <p
            className="sheet-subtitle"
            style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '6px', lineHeight: '1.4' }}
          >
            Price and Print Weight are optional at intake, but <strong>strictly mandatory</strong> once an order moves to <strong>{targetLabel}</strong>.
          </p>
        </div>

        <div
          className="specs-order-summary"
          style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            margin: '16px 0',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)' }}>
            {order.item} {order.qty > 1 && <span>(×{order.qty})</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>
            Customer: <strong style={{ color: 'var(--text)' }}>{order.customer}</strong>
            {order.customer_contact && ` · ${order.customer_contact}`}
          </div>
        </div>

        {errorMsg && (
          <div
            className="banner banner-error"
            style={{ marginBottom: '16px', fontSize: '12.5px', padding: '8px 12px' }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div className={`form-field ${touched && (!price || Number(price) <= 0) ? 'field-error' : ''}`}>
              <label htmlFor="modal-spec-price" style={{ fontSize: '12px', fontWeight: 600 }}>
                Price (₹) <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                id="modal-spec-price"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                autoFocus
                style={{ width: '100%', marginTop: '6px' }}
              />
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Agreed quote / price
              </span>
            </div>

            <div className={`form-field ${touched && (!weightG || Number(weightG) <= 0) ? 'field-error' : ''}`}>
              <label htmlFor="modal-spec-weight" style={{ fontSize: '12px', fontWeight: 600 }}>
                Print Weight (g) <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                id="modal-spec-weight"
                type="number"
                min="0.1"
                step="any"
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                placeholder="grams"
                style={{ width: '100%', marginTop: '6px' }}
              />
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Measured/sliced net weight
              </span>
            </div>
          </div>

          {hasValidWeight && (
            <div
              className="specs-filament-preview"
              style={{
                background: 'rgba(255, 107, 53, 0.08)',
                border: '1px solid rgba(255, 107, 53, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: 'var(--text-bright)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>🧵</span>
              <div>
                <strong>{totalFilament} g total filament</strong>{' '}
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  ({weightNum}g net + {miscOverhead}g 10% misc overhead)
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px', background: 'var(--accent)', color: '#fff' }}
            >
              Save Specs &amp; Move to {targetLabel} →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
