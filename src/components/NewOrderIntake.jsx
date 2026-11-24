import React, { useState, useMemo, useRef, useEffect } from 'react'
import { PRIORITIES, PAINT_FINISHES, PAINT_TYPES } from '../constants/production'
import { ColorSelector } from './ColorSelector'
import { ColorSwatch } from './ColorSwatch'
import { supabase, isConfigured, BUCKET } from '../supabase'
import { logOrderChange } from '../services/historyService'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { InputGroup, InputLeftAddon, InputRightAddon } from '@/components/ui/input-group'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Attachment, AttachmentList, AttachmentItem, AttachmentUpload } from '@/components/ui/attachment'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription } from '@/components/ui/item'
import { Sparkles, Camera, Box, Plus, Trash2, Calendar, Check, Layers, User } from 'lucide-react'

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
  const [infill, setInfill] = useState([20])
  const [primerRequired, setPrimerRequired] = useState(false)
  const [smoothingRequired, setSmoothingRequired] = useState(false)

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
    <form
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      onSubmit={handleSubmit}
      noValidate
    >
      {/* Left Form Column (8 cols on large screens) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Step 1: Customer & Object */}
        <Card className="border-slate-800 bg-[#0d131f] p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              1
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Customer &amp; Object Information
              </h3>
              <p className="text-xs text-slate-400">
                Identify the 3D-printed object and customer receiving it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="new-item" required>
                Part / Item Name
              </FieldLabel>
              <Input
                id="new-item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Cyberpunk Katana, Articulated Dragon..."
                required
                className={touched && !item.trim() ? 'border-destructive' : ''}
              />
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="new-customer" required>
                Customer Name
              </FieldLabel>
              <Input
                id="new-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Priya Sharma, Jordan Rivera..."
                required
                className={touched && !customer.trim() ? 'border-destructive' : ''}
              />
            </Field>

            <Field className="space-y-1.5 sm:col-span-2">
              <FieldLabel htmlFor="new-contact">Contact Phone / Email (Optional)</FieldLabel>
              <Input
                id="new-contact"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="+91 98765 43210 or customer email"
              />
            </Field>

            <div className="grid grid-cols-3 gap-2.5 sm:col-span-2">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="new-qty">Qty</FieldLabel>
                <Input
                  id="new-qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="new-price">Price</FieldLabel>
                <InputGroup>
                  <InputLeftAddon>₹</InputLeftAddon>
                  <Input
                    id="new-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="rounded-l-none"
                  />
                </InputGroup>
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="new-weight">Net Weight</FieldLabel>
                <InputGroup>
                  <Input
                    id="new-weight"
                    type="number"
                    min="0"
                    step="any"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0"
                    className="rounded-r-none"
                  />
                  <InputRightAddon>g</InputRightAddon>
                </InputGroup>
              </Field>
            </div>

            {/* Infill Density Slider */}
            <Field className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <FieldLabel className="text-slate-300">Internal Print Infill Density</FieldLabel>
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
              <FieldDescription>
                Adjust density: 15–20% standard, 35–50% structural parts, 100% solid.
              </FieldDescription>
            </Field>
          </div>

          {hasValidWeight && (
            <div className="rounded-md border border-[#ff5e1e]/20 bg-[#ff5e1e]/5 p-2.5 text-xs font-mono text-[#ff783b]">
              🧵 Calculated with +10% misc overhead:{' '}
              <strong>{totalFilamentGrams}g</strong> ({weightNum}g net +{' '}
              {Math.round(weightNum * 0.1 * 10) / 10}g misc)
            </div>
          )}
        </Card>

        {/* Step 2: Priority & Deadline */}
        <Card className="border-slate-800 bg-[#0d131f] p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              2
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Priority &amp; Delivery Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Set queue priority and target completion deadline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Standard Priority
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="express"
                  variant="outline"
                  className="w-full text-xs font-semibold border-slate-700 data-[state=on]:border-primary data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> Express Priority
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="new-date">Expected Delivery Date</FieldLabel>
              <DatePicker
                date={deliveryDate}
                onChange={setDeliveryDate}
                placeholder="Select expected date"
              />
            </Field>

            {/* Post-Processing Checkbox Options & Expedite Switch */}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-5 pt-1 border-t border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                <Checkbox
                  checked={primerRequired}
                  onCheckedChange={setPrimerRequired}
                />
                <span>Primer base coat required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                <Checkbox
                  checked={smoothingRequired}
                  onCheckedChange={setSmoothingRequired}
                />
                <span>Acetone / vapor smoothing</span>
              </label>
              <div className="flex items-center gap-2 select-none">
                <Switch
                  id="intake-express-switch"
                  checked={priority === 'express'}
                  onCheckedChange={(checked) => setPriority(checked ? 'express' : 'standard')}
                />
                <label htmlFor="intake-express-switch" className="text-xs text-slate-300 cursor-pointer">
                  Rush expedite
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-desc">General Order Notes / Description</Label>
            <Textarea
              id="new-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Print orientation, infill percentage, or customer preferences..."
            />
          </div>
        </Card>

        {/* Step 3: Paint & Finishing Specifications */}
        <Card className="border-slate-800 bg-[#0d131f] p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              3
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Paint Colours &amp; Surface Specifications
              </h3>
              <p className="text-xs text-slate-400">
                Select studio paint shades, chemistry, and surface finish.
              </p>
            </div>
          </div>

          <div className="space-y-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="new-paint-type">Paint Chemistry</FieldLabel>
                <Select value={paintType} onValueChange={setPaintType}>
                  <SelectTrigger id="new-paint-type" className="border-border bg-[#101623] text-foreground text-xs h-9">
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
                <FieldLabel htmlFor="new-finish">Surface Finish</FieldLabel>
                <Select value={finish} onValueChange={setFinish}>
                  <SelectTrigger id="new-finish" className="border-border bg-[#101623] text-foreground text-xs h-9">
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
              <Label htmlFor="new-instructions">Special Painting Instructions</Label>
              <Textarea
                id="new-instructions"
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Drybrush weathering on edges; gloss clear coat on visor..."
              />
            </div>
          </div>
        </Card>

        {/* Step 4: Files & Photos */}
        <Card className="border-slate-800 bg-[#0d131f] p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              4
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                3D CAD Files &amp; Product Photos
              </h3>
              <p className="text-xs text-slate-400">
                Upload STL/3MF files and camera reference photos.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AttachmentUpload
                title="Attach Reference Photos"
                description="Click or drag preview images (PNG, JPG, WebP)"
                accept="image/*"
                onFilesSelected={handleAddPhotos}
                icon={Camera}
              />
              <AttachmentUpload
                title="Attach 3D CAD Mesh Models"
                description=".stl, .3mf, .obj, .gcode, .step, .zip"
                accept={MODEL_EXT}
                onFilesSelected={handleAddModels}
                icon={Box}
              />
            </div>

            {(images.length > 0 || modelFiles.length > 0) && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Staged Attachments ({images.length + modelFiles.length})
                </div>
                <AttachmentList>
                  {previews.map((p, idx) => (
                    <AttachmentItem
                      key={`img-${idx}`}
                      name={p.name}
                      type="image"
                      previewUrl={p.url}
                      onRemove={() =>
                        setImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))}
                  {modelFiles.map((m, idx) => (
                    <AttachmentItem
                      key={`model-${idx}`}
                      name={m.name}
                      size={m.size}
                      type="model"
                      onRemove={() =>
                        setModelFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))}
                </AttachmentList>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={busy}
            className="text-xs"
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={busy || !isValid}
            className="bg-primary text-white hover:bg-primary/90 text-sm font-semibold px-6 py-2.5 flex items-center gap-2"
          >
            {busy ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Logging Order…</span>
              </>
            ) : (
              'Log Order into Production Queue →'
            )}
          </Button>
        </div>
      </div>

      {/* Right Column: Real-Time Live Order Preview Card (4 cols on lg screens, sticky) */}
      <div className="lg:col-span-4 sticky top-6">
        <Card className="border-slate-800 bg-[#0d131f] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="font-mono text-xs font-bold text-primary tracking-wider">
              ● LIVE QUEUE PREVIEW
            </span>
            {priority === 'express' ? (
              <Badge variant="express" className="py-0 px-2 text-[10px]">
                <Sparkles className="mr-1 h-3 w-3" /> Express
              </Badge>
            ) : (
              <Badge variant="muted" className="text-[10px]">
                Standard
              </Badge>
            )}
          </div>

          <div>
            <h4 className="text-base font-bold text-white truncate">
              {item || 'Untitled Part / Print'}
              {Number(qty) > 1 && (
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.2 font-mono text-xs text-cyan">
                  ×{qty}
                </span>
              )}
            </h4>
            <div className="text-xs text-slate-400 mt-1">
              👤 {customer || 'Customer Name'}{' '}
              {customerContact && `· ${customerContact}`}
            </div>
          </div>

          {/* Metrics Preview */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#0a0f19] p-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Price
              </span>
              <span className="block font-mono text-sm font-bold text-[#05d5b3] mt-0.5">
                {priceNum > 0
                  ? `₹${priceNum.toLocaleString('en-IN')}`
                  : '₹0.00 (Optional)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Filament (+10%)
              </span>
              <span className="block font-mono text-xs font-semibold text-[#ff783b] mt-0.5">
                {hasValidWeight ? `🧵 ${totalFilamentGrams}g` : '0g (Optional)'}
              </span>
            </div>
          </div>

          {/* Paint Swatch Preview */}
          <div className="rounded-lg border border-slate-800 bg-[#0a0f19] p-3">
            <div className="text-[10px] uppercase font-mono text-slate-500 mb-2">
              Selected Paint &amp; Finish
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                <span className="text-xs italic text-slate-500">
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

          {/* Infill & Processing Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-cyan">
              Infill: {infill[0]}%
            </span>
            {primerRequired && (
              <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary text-[10.5px]">
                +Primer
              </span>
            )}
            {smoothingRequired && (
              <span className="rounded bg-teal/10 border border-teal/20 px-2 py-0.5 text-teal text-[10.5px]">
                +Vapor Smooth
              </span>
            )}
          </div>

          <Separator className="bg-slate-800" />

          {/* Delivery Target Preview */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Target Delivery:</span>
            <strong className="text-white">
              {deliveryDate
                ? new Date(deliveryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'None'}
            </strong>
          </div>

          {/* Attachments Count Preview */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span>📷 {images.length} photo(s)</span>
            <span>🧊 {modelFiles.length} 3D model(s)</span>
          </div>
        </Card>
      </div>
    </form>
  )
}
