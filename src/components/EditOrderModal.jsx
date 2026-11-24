import React, { useState, useRef, useEffect } from 'react'
import {
  PRIORITIES,
  PAINT_FINISHES,
  PAINT_TYPES,
  STATUS_LOOKUP,
} from '../constants/production'
import { ColorSelector } from './ColorSelector'
import { supabase, isConfigured, BUCKET } from '../supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { InputGroup, InputLeftAddon, InputRightAddon } from '@/components/ui/input-group'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Attachment, AttachmentList, AttachmentItem, AttachmentUpload } from '@/components/ui/attachment'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { X, Sparkles, Plus, Trash2, Upload, FileText, Check } from 'lucide-react'

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
  const [infill, setInfill] = useState([order.infill || 20])
  const [primerRequired, setPrimerRequired] = useState(order.primer_coat || false)

  // Color fields
  const [primaryName, setPrimaryName] = useState(order.primary_color || '')
  const [primaryCode, setPrimaryCode] = useState(order.primary_color_code || '')
  const [secondaryName, setSecondaryName] = useState(order.secondary_color || '')
  const [secondaryCode, setSecondaryCode] = useState(order.secondary_color_code || '')
  const [paintType, setPaintType] = useState(order.paint_type || 'Acrylic')
  const [finish, setFinish] = useState(order.finish || 'Satin')
  const [specialInstructions, setSpecialInstructions] = useState(
    order.special_instructions || ''
  )
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
      url:
        urls[idx] ||
        (path.startsWith('http') || path.startsWith('blob:')
          ? path
          : `/storage/sales/${path}`),
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
      {
        role: `Accent #${prev.length + 1}`,
        name: '',
        code: '',
        paint_type: paintType,
        finish,
        notes: '',
      },
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
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, item.file)
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
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, item.file)
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col max-h-[92vh] overflow-hidden rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-order-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#090d16] p-4 sm:p-5">
          <div>
            <div className="font-mono text-xs text-cyan">
              Editing #{order.id.slice(0, 8)}
            </div>
            <h2
              id="edit-order-title"
              className="text-lg sm:text-xl font-bold text-white tracking-tight"
            >
              Edit Order Specifications &amp; Files
            </h2>
          </div>
          <button
            type="button"
            className="rounded-sm p-1 text-slate-400 hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          id="edit-order-form"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {errorMsg && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/15 p-3 text-xs text-destructive">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Section 1: Customer & Object */}
            <div className="rounded-lg border border-slate-800 bg-[#111726] p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                1. Customer &amp; Object Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="edit-item" required>
                    Printed Item / Part Name
                  </FieldLabel>
                  <Input
                    id="edit-item"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    required
                  />
                </Field>

                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="edit-customer" required>
                    Customer Name
                  </FieldLabel>
                  <Input
                    id="edit-customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    required
                  />
                </Field>

                <Field className="space-y-1.5 sm:col-span-2">
                  <FieldLabel htmlFor="edit-contact">Customer Contact</FieldLabel>
                  <Input
                    id="edit-contact"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="+91..."
                  />
                </Field>

                <div className="grid grid-cols-3 gap-2.5 sm:col-span-2">
                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="edit-qty">Qty</FieldLabel>
                    <Input
                      id="edit-qty"
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </Field>

                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="edit-price">Price</FieldLabel>
                    <InputGroup>
                      <InputLeftAddon>₹</InputLeftAddon>
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="rounded-l-none"
                      />
                    </InputGroup>
                  </Field>

                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="edit-weight">Net Weight</FieldLabel>
                    <InputGroup>
                      <Input
                        id="edit-weight"
                        type="number"
                        step="any"
                        min="0"
                        value={weightG}
                        onChange={(e) => setWeightG(e.target.value)}
                        placeholder="0"
                        className="rounded-r-none"
                      />
                      <InputRightAddon>g</InputRightAddon>
                    </InputGroup>
                  </Field>
                </div>

                {/* Print Infill Density Slider */}
                <Field className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <FieldLabel>Internal Print Infill</FieldLabel>
                    <span className="font-mono text-cyan font-bold">{infill[0]}%</span>
                  </div>
                  <Slider
                    value={infill}
                    onValueChange={setInfill}
                    min={0}
                    max={100}
                    step={5}
                    className="py-1"
                  />
                </Field>
              </div>

              {hasValidWeight && (
                <div className="text-[11px] font-mono text-[#ff783b]">
                  🧵 Total with +10% misc overhead:{' '}
                  <strong>{Math.round(weightNum * 1.1 * 10) / 10}g</strong> ({weightNum}g
                  net + {Math.round(weightNum * 0.1 * 10) / 10}g misc)
                </div>
              )}
            </div>

            {/* Section 2: Priority & Deadline */}
            <div className="rounded-lg border border-slate-800 bg-[#111726] p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                2. Priority &amp; Delivery Deadline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field className="space-y-1.5">
                  <FieldLabel>Processing Priority</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={priority}
                    onValueChange={(val) => val && setPriority(val)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem
                      value="standard"
                      variant="outline"
                      className="w-full text-xs font-medium border-slate-700 data-[state=on]:bg-slate-800 data-[state=on]:border-slate-500 text-slate-300"
                    >
                      Standard
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="express"
                      variant="outline"
                      className="w-full text-xs font-semibold border-slate-700 data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> Express
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="edit-date">Expected Delivery Date</FieldLabel>
                  <DatePicker
                    date={deliveryDate}
                    onChange={setDeliveryDate}
                    placeholder="Set delivery date"
                  />
                </Field>

                {/* Additional Spec Checkboxes & Expedite Switch */}
                <div className="sm:col-span-2 flex flex-wrap items-center gap-5 pt-1 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                    <Checkbox
                      checked={primerRequired}
                      onCheckedChange={setPrimerRequired}
                    />
                    <span>Primer base coat required</span>
                  </label>
                  <div className="flex items-center gap-2 select-none">
                    <Switch
                      id="edit-express-switch"
                      checked={priority === 'express'}
                      onCheckedChange={(checked) => setPriority(checked ? 'express' : 'standard')}
                    />
                    <label htmlFor="edit-express-switch" className="text-xs text-slate-300 cursor-pointer">
                      Rush expedite
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Order Description / Notes</Label>
                <Textarea
                  id="edit-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Special customer requests or print notes..."
                />
              </div>
            </div>

            {/* Section 3: Paint & Finishing Specifications */}
            <div className="rounded-lg border border-slate-800 bg-[#111726] p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                3. Paint Colours &amp; Surface Specifications
              </h3>

              <div className="space-y-4">
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
                  <div
                    key={idx}
                    className="relative rounded-lg border border-slate-800 bg-[#0a0f19] p-3 space-y-2"
                  >
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-xs text-destructive hover:underline"
                      onClick={() => handleRemoveExtraColor(idx)}
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

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExtraColor}
                  className="text-xs text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Additional Accent
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="edit-paint-type">Paint Chemistry</FieldLabel>
                    <Select value={paintType} onValueChange={setPaintType}>
                      <SelectTrigger id="edit-paint-type" className="border-border bg-[#101623] text-foreground text-xs h-9">
                        <SelectValue placeholder="Select paint chemistry" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAINT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="edit-finish">Surface Finish</FieldLabel>
                    <Select value={finish} onValueChange={setFinish}>
                      <SelectTrigger id="edit-finish" className="border-border bg-[#101623] text-foreground text-xs h-9">
                        <SelectValue placeholder="Select surface finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAINT_FINISHES.map((f) => (
                          <SelectItem key={f} value={f} className="text-xs">
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-instructions">
                    Special Painting Instructions
                  </Label>
                  <Textarea
                    id="edit-instructions"
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Mask edges; apply two coats of clear polyurethane"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Photos & 3D Models */}
            <div className="rounded-lg border border-slate-800 bg-[#111726] p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                4. Attached Photos &amp; 3D Models
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <AttachmentUpload
                    title="Upload Product Photos"
                    description="PNG, JPG, WebP images"
                    accept="image/*"
                    onFilesSelected={handleAddPhotos}
                    icon={Upload}
                  />
                  <AttachmentUpload
                    title="Upload 3D CAD Models"
                    description=".stl, .3mf, .obj, .gcode, .step, .zip"
                    accept={MODEL_EXT}
                    onFilesSelected={handleAddModels}
                    icon={Upload}
                  />
                </div>

                {(existingPhotos.length > 0 ||
                  newPhotoFiles.length > 0 ||
                  existingModels.length > 0 ||
                  newModelFiles.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Current Attachments (
                      {existingPhotos.length +
                        newPhotoFiles.length +
                        existingModels.length +
                        newModelFiles.length}
                      )
                    </div>
                    <AttachmentList>
                      {existingPhotos.map((p, idx) => (
                        <AttachmentItem
                          key={`exist-p-${idx}`}
                          name={p.name || `Photo #${idx + 1}`}
                          type="image"
                          previewUrl={p.url}
                          onRemove={() => handleRemoveExistingPhoto(idx)}
                        />
                      ))}
                      {newPhotoFiles.map((p, idx) => (
                        <AttachmentItem
                          key={`new-p-${idx}`}
                          name={`${p.name} (New)`}
                          type="image"
                          previewUrl={p.previewUrl}
                          onRemove={() => handleRemoveNewPhoto(idx)}
                        />
                      ))}
                      {existingModels.map((m, idx) => (
                        <AttachmentItem
                          key={`exist-m-${idx}`}
                          name={m.name || `3D Model #${idx + 1}`}
                          size={m.size}
                          type="model"
                          onRemove={() => handleRemoveExistingModel(idx)}
                        />
                      ))}
                      {newModelFiles.map((m, idx) => (
                        <AttachmentItem
                          key={`new-m-${idx}`}
                          name={`${m.name} (New)`}
                          size={m.size}
                          type="model"
                          onRemove={() => handleRemoveNewModel(idx)}
                        />
                      ))}
                    </AttachmentList>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#090d16] p-3 sm:p-4">
            {onDeleteOrder ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/15"
                onClick={() => {
                  if (
                    window.confirm(
                      `Permanently remove order for "${order.item}" from the studio ledger?`
                    )
                  ) {
                    onDeleteOrder(order)
                  }
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={saving}
                className="text-xs bg-primary text-white hover:bg-primary/90 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner size="xs" className="text-white" />
                    <span>{uploadStatus || 'Saving…'}</span>
                  </>
                ) : (
                  'Save Changes ✓'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
