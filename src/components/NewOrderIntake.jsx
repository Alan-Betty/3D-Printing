import { useState, useMemo, useRef, useEffect } from 'react'
import { PRIORITIES, PAINT_FINISHES, PAINT_TYPES } from '../constants/production'
import { ColorSelector } from './ColorSelector'
import { ColorSwatch } from './ColorSwatch'
import { supabase, isConfigured, BUCKET } from '../supabase'
import { logOrderChange } from '../services/historyService'

const sanitize = (name) => name.replace(/[^\w.\-]+/g, '_')
const MODEL_EXT = '.stl,.3mf,.obj,.gcode,.step,.stp,.zip'

export function NewOrderIntake({ user, isSandbox, onError, onSaved }) {
  const [item, setItem] = useState('')
  const [customer, setCustomer] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [description, setDescription] = useState('')

  const [priority, setPriority] = useState('standard')
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().split('T')[0]
  })

  // Colors
  const [primaryColorName, setPrimaryColorName] = useState('')
  const [primaryColorCode, setPrimaryColorCode] = useState('')
  const [secondaryColorName, setSecondaryColorName] = useState('')
  const [secondaryColorCode, setSecondaryColorCode] = useState('')
  const [paintType, setPaintType] = useState('Acrylic')
  const [finish, setFinish] = useState('Satin')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [colorNotes, setColorNotes] = useState('')
  const [extraColors, setExtraColors] = useState([])

  // Files
  const [modelFiles, setModelFiles] = useState([])
  const [images, setImages] = useState([])

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const modelInputRef = useRef(null)

  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const previews = useMemo(
    () => images.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [images]
  )
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews]
  )

  const priceNum = Number(price)
  const weightNum = Number(weight)
  const isPriceValid = price === '' || (!Number.isNaN(priceNum) && priceNum >= 0)
  const isWeightValid = weight === '' || (!Number.isNaN(weightNum) && weightNum >= 0)
  const isValid = Boolean(item.trim() && customer.trim() && isPriceValid && isWeightValid)

  const hasValidWeight = weight !== '' && !Number.isNaN(weightNum) && weightNum > 0
  const totalFilamentGrams = hasValidWeight ? Math.round(weightNum * 1.1 * 10) / 10 : 0

  const handleAddPhotos = (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'))
    if (list.length) setImages((prev) => [...prev, ...list])
  }

  const handleAddModels = (files) => {
    const list = Array.from(files || [])
    if (list.length) setModelFiles((prev) => [...prev, ...list])
  }

  const handleDatePreset = (daysAhead) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    setDeliveryDate(d.toISOString().split('T')[0])
  }

  const resetForm = () => {
    setItem('')
    setCustomer('')
    setQty('1')
    setPrice('')
    setWeight('')
    setCustomerContact('')
    setDescription('')
    setPriority('standard')
    setPrimaryColorName('')
    setPrimaryColorCode('')
    setSecondaryColorName('')
    setSecondaryColorCode('')
    setPaintType('Acrylic')
    setFinish('Satin')
    setSpecialInstructions('')
    setColorNotes('')
    setExtraColors([])
    setModelFiles([])
    setImages([])
    setTouched(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return setTouched(true)
    setBusy(true)
    onError('')

    try {
      const id = crypto.randomUUID()

      const colors = []
      if (primaryColorName.trim() || primaryColorCode.trim()) {
        colors.push({
          role: 'Primary',
          name: primaryColorName.trim(),
          code: primaryColorCode.trim(),
          paint_type: paintType,
          finish,
          notes: colorNotes.trim(),
        })
      }
      if (secondaryColorName.trim() || secondaryColorCode.trim()) {
        colors.push({
          role: 'Secondary',
          name: secondaryColorName.trim(),
          code: secondaryColorCode.trim(),
          paint_type: paintType,
          finish,
          notes: '',
        })
      }
      for (const ec of extraColors) {
        if (ec.name?.trim() || ec.code?.trim()) {
          colors.push({
            role: ec.role || 'Accent',
            name: ec.name.trim(),
            code: ec.code.trim(),
            paint_type: ec.paint_type || paintType,
            finish: ec.finish || finish,
            notes: '',
          })
        }
      }

      let modelMetas = []
      let imagePaths = []

      if (isConfigured && !isSandbox) {
        for (let i = 0; i < modelFiles.length; i++) {
          const f = modelFiles[i]
          const path = `${id}/model_${i}_${sanitize(f.name)}`
          const { error } = await supabase.storage.from(BUCKET).upload(path, f)
          if (error) throw error
          modelMetas.push({ path, name: f.name })
        }

        for (let i = 0; i < images.length; i++) {
          const f = images[i]
          const path = `${id}/img_${i}_${sanitize(f.name)}`
          const { error } = await supabase.storage.from(BUCKET).upload(path, f)
          if (error) throw error
          imagePaths.push(path)
        }
      } else {
        modelMetas = modelFiles.map((f) => ({ name: f.name, path: `local/${f.name}` }))
        imagePaths = previews.map((p) => p.url)
      }

      const newOrder = {
        id,
        item: item.trim(),
        customer: customer.trim(),
        customer_contact: customerContact.trim(),
        description: description.trim(),
        qty: Math.max(1, Math.round(Number(qty) || 1)),
        price: price === '' ? 0 : priceNum,
        weight_g: weight === '' ? null : Number(weight),
        print_type: priority === 'express' ? 'express' : 'regular',
        priority,
        delivery_date: deliveryDate ? deliveryDate : null,
        production_status: 'order_received',
        primary_color: primaryColorName.trim(),
        primary_color_code: primaryColorCode.trim(),
        secondary_color: secondaryColorName.trim(),
        secondary_color_code: secondaryColorCode.trim(),
        paint_type: paintType,
        finish,
        special_instructions: specialInstructions.trim(),
        color_notes: colorNotes.trim(),
        colors,
        model_files: modelMetas,
        images: imagePaths,
        created_at: new Date().toISOString(),
      }

      if (isConfigured && !isSandbox) {
        const { error } = await supabase.from('sales').insert(newOrder)
        if (error) throw error
      }

      await logOrderChange({
        saleId: id,
        fieldChanged: 'order_created',
        oldValue: null,
        newValue: 'Order Received',
        notes: `Logged into studio queue with ${priority.toUpperCase()} priority`,
        user,
      })

      resetForm()
      onSaved(newOrder)
    } catch (err) {
      console.error('Error logging order:', err)
      onError(err?.message || 'Failed to log order into queue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="intake-layout" onSubmit={handleSubmit} noValidate>
      {/* Left Form Column */}
      <div className="intake-form-column">
        {/* Step 1: Customer & Object */}
        <div className="form-card">
          <div className="form-card-head">
            <span className="card-step-badge">1</span>
            <div>
              <h3 className="form-card-title">Customer &amp; Object Information</h3>
              <p className="form-card-sub">Identify the 3D-printed object and customer receiving it.</p>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="new-item">
                Part / Item Name *
              </label>
              <input
                id="new-item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Cyberpunk Katana, Articulated Dragon..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-customer">
                Customer Name *
              </label>
              <input
                id="new-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Priya Sharma, Jordan Rivera..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-contact">
                Contact Phone / Email <span className="form-label-opt">(Optional)</span>
              </label>
              <input
                id="new-contact"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="form-grid-3" style={{ gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-qty">Qty</label>
                <input
                  id="new-qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-price">
                  Price (₹) <span className="form-label-opt">(Optional)</span>
                </label>
                <input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-weight">
                  Weight (g) <span className="form-label-opt">(Optional)</span>
                </label>
                <input
                  id="new-weight"
                  type="number"
                  min="0"
                  step="any"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="grams"
                />
              </div>
            </div>
          </div>

          {hasValidWeight && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              🧵 Calculated with +10% misc overhead: <strong>{totalFilamentGrams}g</strong> ({weightNum}g net + {Math.round(weightNum * 0.1 * 10) / 10}g misc)
            </div>
          )}
        </div>

        {/* Step 2: Priority & Deadline */}
        <div className="form-card">
          <div className="form-card-head">
            <span className="card-step-badge">2</span>
            <div>
              <h3 className="form-card-title">Priority &amp; Delivery Schedule</h3>
              <p className="form-card-sub">Set queue priority and target completion deadline.</p>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Processing Priority</label>
              <div className="priority-toggle-wrap">
                <button
                  type="button"
                  className={`prio-btn prio-standard ${priority === 'standard' ? 'active' : ''}`}
                  onClick={() => setPriority('standard')}
                >
                  Standard Priority
                </button>
                <button
                  type="button"
                  className={`prio-btn prio-express ${priority === 'express' ? 'active' : ''}`}
                  onClick={() => setPriority('express')}
                >
                  ⚡ Express Priority
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-date">Expected Delivery Date</label>
              <input
                id="new-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-deep)', border: '1px solid var(--line)' }}
                  onClick={() => handleDatePreset(3)}
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-deep)', border: '1px solid var(--line)' }}
                  onClick={() => handleDatePreset(7)}
                >
                  +1 Week
                </button>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-deep)', border: '1px solid var(--line)' }}
                  onClick={() => handleDatePreset(14)}
                >
                  +2 Weeks
                </button>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label" htmlFor="new-desc">General Order Notes / Description</label>
            <textarea
              id="new-desc"
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Print orientation, infill percentage, or customer preferences..."
            />
          </div>
        </div>

        {/* Step 3: Paint & Finishing Specifications */}
        <div className="form-card">
          <div className="form-card-head">
            <span className="card-step-badge">3</span>
            <div>
              <h3 className="form-card-title">Paint Colours &amp; Surface Specifications</h3>
              <p className="form-card-sub">Select studio paint shades, chemistry, and surface finish.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ColorSelector
              label="Primary Base Colour"
              name={primaryColorName}
              code={primaryColorCode}
              role="Primary Base"
              onChange={({ name: n, code: c }) => {
                setPrimaryColorName(n)
                setPrimaryColorCode(c)
              }}
            />

            <ColorSelector
              label="Secondary Accent Colour"
              name={secondaryColorName}
              code={secondaryColorCode}
              role="Secondary Trim"
              optional
              onChange={({ name: n, code: c }) => {
                setSecondaryColorName(n)
                setSecondaryColorCode(c)
              }}
            />

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="new-paint-type">Paint Chemistry</label>
                <select
                  id="new-paint-type"
                  value={paintType}
                  onChange={(e) => setPaintType(e.target.value)}
                >
                  {PAINT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-finish">Surface Finish</label>
                <select
                  id="new-finish"
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                >
                  {PAINT_FINISHES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-instructions">Special Painting Instructions</label>
              <textarea
                id="new-instructions"
                rows="2"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Drybrush weathering on edges; gloss clear coat on visor..."
              />
            </div>
          </div>
        </div>

        {/* Step 4: Files & Photos */}
        <div className="form-card">
          <div className="form-card-head">
            <span className="card-step-badge">4</span>
            <div>
              <h3 className="form-card-title">3D CAD Files &amp; Product Photos</h3>
              <p className="form-card-sub">Upload STL/3MF files and camera reference photos.</p>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleAddPhotos(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => handleAddPhotos(e.target.files)}
              />
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <span className="dropzone-icon">📷</span>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-bright)' }}>
                  Attach Product Photos
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--muted-2)' }}>
                  Drag &amp; drop images or click to browse
                </span>
                <button
                  type="button"
                  style={{ marginTop: '6px', fontSize: '11.5px', padding: '3px 10px', background: 'var(--panel-elevated)', border: '1px solid var(--line)', borderRadius: 'var(--radius-xs)', color: 'var(--muted)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    cameraInputRef.current?.click()
                  }}
                >
                  📸 Launch Camera
                </button>
              </div>

              {images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {previews.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                      <img src={p.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <input
                ref={modelInputRef}
                type="file"
                accept={MODEL_EXT}
                multiple
                hidden
                onChange={(e) => handleAddModels(e.target.files)}
              />
              <div
                className="dropzone"
                onClick={() => modelInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <span className="dropzone-icon">🧊</span>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-bright)' }}>
                  Attach 3D CAD Models
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--muted-2)' }}>
                  .stl, .3mf, .obj, .gcode, .step, .zip
                </span>
              </div>

              {modelFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {modelFiles.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', fontSize: '12px' }}>
                      <span style={{ color: 'var(--cyan)' }}>🧊 {m.name}</span>
                      <button
                        type="button"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setModelFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={resetForm}
            disabled={busy}
          >
            Clear Form
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !isValid}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            {busy ? 'Logging Order…' : 'Log Order into Production Queue →'}
          </button>
        </div>
      </div>

      {/* Right Sticky Column: Real-Time Live Order Preview Card */}
      <div className="live-preview-column">
        <div className="preview-card-wrap">
          <div className="preview-badge-header">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
              ● LIVE QUEUE PREVIEW
            </span>
            {priority === 'express' ? (
              <span className="badge-prio express">⚡ Express Priority</span>
            ) : (
              <span className="badge-prio standard">Standard Priority</span>
            )}
          </div>

          <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-bright)', margin: '0 0 6px' }}>
            {item || 'Untitled Part / Print'}
            {Number(qty) > 1 && <span className="clean-qty-tag" style={{ marginLeft: '8px' }}>×{qty}</span>}
          </h3>

          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            👤 {customer || 'Customer Name'} {customerContact && `· ${customerContact}`}
          </div>

          {/* Metrics Preview */}
          <div className="card-metrics-strip" style={{ marginBottom: '16px' }}>
            <div className="card-metric-block">
              <span className="card-metric-label">Quoted Price</span>
              <span className="card-metric-val price">
                {priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : '₹0.00 (Optional)'}
              </span>
            </div>

            <div className="card-metric-block">
              <span className="card-metric-label">Filament (+10% Misc)</span>
              <span className="card-metric-val weight">
                {hasValidWeight ? `🧵 ${totalFilamentGrams}g` : '0g (Optional)'}
              </span>
            </div>
          </div>

          {/* Paint Swatch Preview */}
          <div style={{ padding: '12px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Selected Paint &amp; Finish
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {primaryColorName || primaryColorCode ? (
                <ColorSwatch
                  name={primaryColorName}
                  code={primaryColorCode}
                  finish={finish}
                  paintType={paintType}
                  role="Base"
                  compact
                />
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--muted-2)', fontStyle: 'italic' }}>
                  Standard Primer
                </span>
              )}
              {secondaryColorName && (
                <ColorSwatch
                  name={secondaryColorName}
                  code={secondaryColorCode}
                  role="Trim"
                  compact
                />
              )}
            </div>
          </div>

          {/* Delivery Target Preview */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: 'var(--muted)' }}>
            <span>Target Delivery:</span>
            <strong style={{ color: 'var(--text-bright)' }}>
              {deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}
            </strong>
          </div>

          {/* Attachments Count Preview */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted-2)' }}>
            <span>📷 {images.length} photo(s)</span>
            <span>🧊 {modelFiles.length} 3D model(s)</span>
          </div>
        </div>
      </div>
    </form>
  )
}
