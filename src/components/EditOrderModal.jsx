import { useState, useRef, useEffect } from 'react'
import { PRIORITIES, PAINT_FINISHES, PAINT_TYPES, STATUS_LOOKUP } from '../constants/production'
import { ColorSelector } from './ColorSelector'
import { supabase, isConfigured, BUCKET } from '../supabase'

const sanitize = (name) => name.replace(/[^\w.\-]+/g, '_')
const MODEL_EXT = '.stl,.3mf,.obj,.gcode,.step,.stp,.zip'

export function EditOrderModal({ order, onClose, onSave, onDeleteOrder }) {
  const [item, setItem] = useState(order.item || '')
  const [customer, setCustomer] = useState(order.customer || '')
  const [qty, setQty] = useState(order.qty || 1)
  const [priority, setPriority] = useState(order.priority || 'standard')
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date || '')
  const [customerContact, setCustomerContact] = useState(order.customer_contact || '')
  const [description, setDescription] = useState(order.description || '')
  const [price, setPrice] = useState(
    order.price != null && Number(order.price) > 0 ? String(order.price) : ''
  )
  const [weightG, setWeightG] = useState(
    order.weight_g != null && Number(order.weight_g) > 0 ? String(order.weight_g) : ''
  )

  const isPrintingOrBeyond =
    order.production_status !== 'order_received' &&
    order.production_status !== 'cancelled' &&
    order.production_status !== 'on_hold' &&
    (STATUS_LOOKUP[order.production_status]?.step ?? 0) >= 1

  // Color fields
  const [primaryName, setPrimaryName] = useState(order.primary_color || '')
  const [primaryCode, setPrimaryCode] = useState(order.primary_color_code || '')
  const [secondaryName, setSecondaryName] = useState(order.secondary_color || '')
  const [secondaryCode, setSecondaryCode] = useState(order.secondary_color_code || '')
  const [paintType, setPaintType] = useState(order.paint_type || 'Acrylic')
  const [finish, setFinish] = useState(order.finish || 'Satin')
  const [specialInstructions, setSpecialInstructions] = useState(order.special_instructions || '')
  const [colorNotes, setColorNotes] = useState(order.color_notes || '')

  // Multi-color dynamic array (accents)
  const [extraColors, setExtraColors] = useState(() => {
    const list = order.colors || []
    return list.slice(2)
  })

  // Existing attached photos and 3D CAD models
  const [existingPhotos, setExistingPhotos] = useState(() => {
    const paths = order.images || []
    const urls = order.imageUrls || []
    return paths.map((path, idx) => ({
      path,
      url: urls[idx] || (path.startsWith('http') || path.startsWith('blob:') ? path : `/storage/sales/${path}`),
    }))
  })

  const [existingModels, setExistingModels] = useState(() => {
    const raw = order.model_files || []
    const enriched = order.modelFiles || []
    return raw.map((m, idx) => ({
      name: m.name || enriched[idx]?.name || '3D Model',
      path: m.path || enriched[idx]?.path || '',
      url: enriched[idx]?.url || (m.path ? `/storage/sales/${m.path}` : ''),
    }))
  })

  // Staged newly selected files for upload
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newModelFiles, setNewModelFiles] = useState([])

  const photoInputRef = useRef(null)
  const modelInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleAddExtraColor = () => {
    setExtraColors((prev) => [
      ...prev,
      { role: `Accent #${prev.length + 1}`, name: '', code: '', paint_type: paintType, finish, notes: '' },
    ])
  }

  const handleUpdateExtraColor = (idx, field, value) => {
    setExtraColors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
  }

  const handleRemoveExtraColor = (idx) => {
    setExtraColors((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAddPhotos = (fileList) => {
    if (!fileList || fileList.length === 0) return
    const added = Array.from(fileList).map((file) => ({
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }))
    setNewPhotoFiles((prev) => [...prev, ...added])
  }

  const handleRemoveExistingPhoto = (idx) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleRemoveNewPhoto = (idx) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAddModels = (fileList) => {
    if (!fileList || fileList.length === 0) return
    const added = Array.from(fileList).map((file) => ({
      file,
      name: file.name,
      size: file.size,
    }))
    setNewModelFiles((prev) => [...prev, ...added])
  }

  const handleRemoveExistingModel = (idx) => {
    setExistingModels((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleRemoveNewModel = (idx) => {
    setNewModelFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setUploadStatus('Saving changes...')

    try {
      // 1. Upload newly staged photos
      const uploadedImagePaths = []
      if (newPhotoFiles.length > 0) {
        setUploadStatus(`Uploading ${newPhotoFiles.length} photo(s)...`)
        for (let i = 0; i < newPhotoFiles.length; i++) {
          const item = newPhotoFiles[i]
          if (isConfigured) {
            const path = `${order.id}/img_${Date.now()}_${i}_${sanitize(item.name)}`
            const { error } = await supabase.storage.from(BUCKET).upload(path, item.file)
            if (error) throw error
            uploadedImagePaths.push(path)
          } else {
            uploadedImagePaths.push(item.previewUrl)
          }
        }
      }

      // 2. Upload newly staged 3D model files
      const uploadedModelMetas = []
      if (newModelFiles.length > 0) {
        setUploadStatus(`Uploading ${newModelFiles.length} 3D model(s)...`)
        for (let i = 0; i < newModelFiles.length; i++) {
          const item = newModelFiles[i]
          if (isConfigured) {
            const path = `${order.id}/model_${Date.now()}_${i}_${sanitize(item.name)}`
            const { error } = await supabase.storage.from(BUCKET).upload(path, item.file)
            if (error) throw error
            uploadedModelMetas.push({ path, name: item.name })
          } else {
            uploadedModelMetas.push({ path: `local/${item.name}`, name: item.name })
          }
        }
      }

      // 3. Construct unified colors array
      const colors = []
      if (primaryName.trim() || primaryCode.trim()) {
        colors.push({
          role: 'Primary',
          name: primaryName.trim(),
          code: primaryCode.trim(),
          paint_type: paintType,
          finish,
          notes: colorNotes.trim(),
        })
      }
      if (secondaryName.trim() || secondaryCode.trim()) {
        colors.push({
          role: 'Secondary',
          name: secondaryName.trim(),
          code: secondaryCode.trim(),
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
            notes: ec.notes || '',
          })
        }
      }

      // 4. Combine existing + newly uploaded file paths
      const finalImagePaths = [
        ...existingPhotos.map((p) => p.path),
        ...uploadedImagePaths,
      ]
      const finalModelMetas = [
        ...existingModels.map((m) => ({ name: m.name, path: m.path })),
        ...uploadedModelMetas,
      ]

      const priceNum = price === '' ? 0 : Number(price)
      const weightNum = weightG === '' ? null : Number(weightG)

      const updates = {
        item: item.trim(),
        customer: customer.trim(),
        customer_contact: customerContact.trim(),
        description: description.trim(),
        qty: Math.max(1, Math.round(Number(qty) || 1)),
        priority,
        print_type: priority === 'express' ? 'express' : 'regular',
        delivery_date: deliveryDate ? deliveryDate : null,
        price: Number.isNaN(priceNum) ? 0 : priceNum,
        weight_g: weightG === '' ? null : weightNum,
        primary_color: primaryName.trim(),
        primary_color_code: primaryCode.trim(),
        secondary_color: secondaryName.trim(),
        secondary_color_code: secondaryCode.trim(),
        paint_type: paintType,
        finish,
        special_instructions: specialInstructions.trim(),
        color_notes: colorNotes.trim(),
        colors,
        images: finalImagePaths,
        model_files: finalModelMetas,
      }

      await onSave(order, updates)
      onClose()
    } catch (err) {
      console.error('Error saving order updates:', err)
      setErrorMsg(err?.message || 'Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
      setUploadStatus('')
    }
  }

  const weightNum = Number(weightG)
  const hasValidWeight = !Number.isNaN(weightNum) && weightNum > 0

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="sheet sheet-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-order-title"
      >
        {/* Fixed Header */}
        <div className="sheet-head">
          <button
            type="button"
            className="sheet-x"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
            Editing #{order.id}
          </div>
          <h2 id="edit-order-title" className="sheet-title">
            Edit Order Specifications &amp; Files
          </h2>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="edit-order-form" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="sheet-body">
            {errorMsg && (
              <div className="banner banner-error" style={{ marginBottom: 0 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Section 1: Customer & Object */}
            <div className="form-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: 'var(--text-bright)' }}>
                1. Customer &amp; Object Details
              </h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-item">
                    Printed Item / Part Name *
                  </label>
                  <input
                    id="edit-item"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-customer">
                    Customer Name *
                  </label>
                  <input
                    id="edit-customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-contact">
                    Customer Contact (Phone / Email)
                  </label>
                  <input
                    id="edit-contact"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="+91..."
                  />
                </div>

                <div className="form-grid-3" style={{ gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-qty">Qty</label>
                    <input
                      id="edit-qty"
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-price">Price (₹)</label>
                    <input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-weight">Weight (g)</label>
                    <input
                      id="edit-weight"
                      type="number"
                      step="any"
                      min="0"
                      value={weightG}
                      onChange={(e) => setWeightG(e.target.value)}
                      placeholder="grams"
                    />
                  </div>
                </div>
              </div>

              {hasValidWeight && (
                <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  🧵 Total with +10% misc overhead: <strong>{Math.round(weightNum * 1.1 * 10) / 10}g</strong> ({weightNum}g net + {Math.round(weightNum * 0.1 * 10) / 10}g misc)
                </div>
              )}
            </div>

            {/* Section 2: Priority & Deadline */}
            <div className="form-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: 'var(--text-bright)' }}>
                2. Priority &amp; Delivery Deadline
              </h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Processing Priority</label>
                  <div className="priority-toggle-wrap">
                    <button
                      type="button"
                      className={`prio-btn prio-standard ${priority === 'standard' ? 'active' : ''}`}
                      onClick={() => setPriority('standard')}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={`prio-btn prio-express ${priority === 'express' ? 'active' : ''}`}
                      onClick={() => setPriority('express')}
                    >
                      ⚡ Express
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-date">Expected Delivery Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label" htmlFor="edit-desc">General Order Notes / Description</label>
                <textarea
                  id="edit-desc"
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Special customer requests or print notes..."
                />
              </div>
            </div>

            {/* Section 3: Paint & Finishing Specifications */}
            <div className="form-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: 'var(--text-bright)' }}>
                3. Paint Colours &amp; Surface Specifications
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ColorSelector
                  label="Primary Base Colour"
                  name={primaryName}
                  code={primaryCode}
                  role="Primary Base"
                  onChange={({ name: n, code: c }) => {
                    setPrimaryName(n)
                    setPrimaryCode(c)
                  }}
                />

                <ColorSelector
                  label="Secondary Accent Colour"
                  name={secondaryName}
                  code={secondaryCode}
                  role="Secondary Trim"
                  optional
                  onChange={({ name: n, code: c }) => {
                    setSecondaryName(n)
                    setSecondaryCode(c)
                  }}
                />

                {extraColors.map((ec, idx) => (
                  <div key={idx} style={{ position: 'relative', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--danger)', fontSize: '12px' }}
                      onClick={() => handleRemoveExtraColor(idx)}
                      title="Remove accent"
                    >
                      ✕ Remove
                    </button>
                    <ColorSelector
                      label={ec.role || `Accent #${idx + 1}`}
                      name={ec.name}
                      code={ec.code}
                      role={ec.role || `Accent #${idx + 1}`}
                      onChange={({ name: n, code: c }) => {
                        handleUpdateExtraColor(idx, 'name', n)
                        handleUpdateExtraColor(idx, 'code', c)
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  style={{ alignSelf: 'flex-start', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleAddExtraColor}
                >
                  + Add Additional Colour Accent
                </button>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-paint-type">Paint Chemistry</label>
                    <select
                      id="edit-paint-type"
                      value={paintType}
                      onChange={(e) => setPaintType(e.target.value)}
                    >
                      {PAINT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-finish">Surface Finish</label>
                    <select
                      id="edit-finish"
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
                  <label className="form-label" htmlFor="edit-instructions">Special Painting Instructions</label>
                  <textarea
                    id="edit-instructions"
                    rows="2"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Mask edges; apply two coats of clear polyurethane"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Photos & 3D Models */}
            <div className="form-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: 'var(--text-bright)' }}>
                4. Attached Photos &amp; 3D Models
              </h3>

              {/* Photos Dropzone & List */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label">Product Photos ({existingPhotos.length + newPhotoFiles.length})</label>
                  <button
                    type="button"
                    style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    + Add Photos
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handleAddPhotos(e.target.files)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {existingPhotos.map((p, idx) => (
                    <div key={`exist-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                      <img src={p.url} alt="existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveExistingPhoto(idx)}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {newPhotoFiles.map((p, idx) => (
                    <div key={`new-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                      <img src={p.previewUrl} alt="staged" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--accent)', color: '#fff', fontSize: '9px', textAlign: 'center', fontWeight: 700 }}>NEW</span>
                      <button
                        type="button"
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveNewPhoto(idx)}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D Model Files */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label">3D CAD Files ({existingModels.length + newModelFiles.length})</label>
                  <button
                    type="button"
                    style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: 600 }}
                    onClick={() => modelInputRef.current?.click()}
                  >
                    + Add 3D Models
                  </button>
                  <input
                    ref={modelInputRef}
                    type="file"
                    accept={MODEL_EXT}
                    multiple
                    hidden
                    onChange={(e) => handleAddModels(e.target.files)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {existingModels.map((m, idx) => (
                    <div key={`exist-m-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-bright)' }}>🧊 {m.name}</span>
                      <button
                        type="button"
                        style={{ color: 'var(--danger)', fontSize: '12px' }}
                        onClick={() => handleRemoveExistingModel(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {newModelFiles.map((m, idx) => (
                    <div key={`new-m-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--cyan-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan)' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--cyan)' }}>🧊 {m.name} (Ready to upload)</span>
                      <button
                        type="button"
                        style={{ color: 'var(--danger)', fontSize: '12px' }}
                        onClick={() => handleRemoveNewModel(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Guaranteed Sticky Action Footer */}
          <div className="sheet-foot">
            {onDeleteOrder && (
              <button
                type="button"
                className="del-btn"
                onClick={() => {
                  if (window.confirm(`Permanently delete order #${order.id.slice(0, 8)} ("${order.item}") from production queue?`)) {
                    onDeleteOrder(order)
                    onClose()
                  }
                }}
                disabled={saving}
              >
                🗑️ Delete Order
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (uploadStatus || 'Saving Changes...') : 'Save Changes →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
