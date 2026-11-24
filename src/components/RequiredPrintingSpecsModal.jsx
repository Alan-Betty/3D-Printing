import React, { useState } from 'react'
import { STATUS_LOOKUP } from '../constants/production'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { InputGroup, InputLeftAddon, InputRightAddon } from '@/components/ui/input-group'
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription } from '@/components/ui/item'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { AlertTriangle, X, Printer, PackageCheck, Sparkles, Scale } from 'lucide-react'

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
  const [overheadPercent, setOverheadPercent] = useState([10])
  const [includeOverhead, setIncludeOverhead] = useState(true)
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
  const rate = includeOverhead ? overheadPercent[0] / 100 : 0
  const miscOverhead = hasValidWeight ? Math.round(weightNum * rate * 10) / 10 : 0
  const totalFilament = hasValidWeight ? Math.round((weightNum + miscOverhead) * 10) / 10 : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-modal-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-[#0e1422] p-6 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              onClick={onCancel}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Close dialog (Esc)</TooltipContent>
        </Tooltip>

        <div className="mb-4">
          <Badge
            variant="cyan"
            className="mb-2 gap-1.5 py-0.5 px-2.5 font-mono text-[11px]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Advancing to {targetLabel}</span>
          </Badge>
          <h2
            id="specs-modal-title"
            className="text-lg font-bold text-white tracking-tight"
          >
            Printing Specifications Required
          </h2>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Price and Print Weight are optional at intake, but{' '}
            <strong className="text-slate-200">strictly mandatory</strong> once an order moves to{' '}
            <strong className="text-[#00f0ff]">{targetLabel}</strong>.
          </p>
        </div>

        {/* Order Brief Summary using Item primitive */}
        <div className="mb-4 rounded-lg border border-slate-800 bg-[#121929] p-3">
          <Item className="gap-3">
            <ItemMedia className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
              <PackageCheck className="h-5 w-5" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>{order.item}</span>
                {order.qty > 1 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    ×{order.qty}
                  </Badge>
                )}
              </ItemTitle>
              <ItemDescription className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{order.customer}</strong>
                {order.customer_contact && ` · ${order.customer_contact}`}
              </ItemDescription>
            </ItemContent>
          </Item>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 p-2.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="modal-spec-price">
                Price (₹) <span className="text-primary">*</span>
              </FieldLabel>
              <InputGroup>
                <InputLeftAddon>₹</InputLeftAddon>
                <Input
                  id="modal-spec-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className={touched && (!price || Number(price) <= 0) ? 'border-destructive rounded-l-none' : 'rounded-l-none'}
                />
              </InputGroup>
              <FieldDescription>Agreed quote or sale price</FieldDescription>
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="modal-spec-weight">
                Print Weight (g) <span className="text-primary">*</span>
              </FieldLabel>
              <InputGroup>
                <Input
                  id="modal-spec-weight"
                  type="number"
                  min="0.1"
                  step="any"
                  value={weightG}
                  onChange={(e) => setWeightG(e.target.value)}
                  placeholder="grams"
                  className={touched && (!weightG || Number(weightG) <= 0) ? 'border-destructive rounded-r-none' : 'rounded-r-none'}
                />
                <InputRightAddon>g</InputRightAddon>
              </InputGroup>
              <FieldDescription>Measured slicer net weight</FieldDescription>
            </Field>
          </div>

          <Separator className="bg-slate-800/80 my-2" />

          {/* Filament Overhead Fine-Tuning Slider & Switch */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Switch
                  id="specs-overhead-switch"
                  checked={includeOverhead}
                  onCheckedChange={setIncludeOverhead}
                />
                <label
                  htmlFor="specs-overhead-switch"
                  className="font-medium text-slate-300 cursor-pointer select-none"
                >
                  Filament Overhead Buffer
                </label>
              </div>
              <span className="font-mono text-xs text-primary font-bold">
                {includeOverhead ? `+${overheadPercent[0]}%` : '0%'}
              </span>
            </div>

            {includeOverhead && (
              <div className="space-y-1.5 pt-1">
                <Slider
                  value={overheadPercent}
                  onValueChange={setOverheadPercent}
                  min={5}
                  max={25}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5% (tight)</span>
                  <span>10% (recommended)</span>
                  <span>25% (heavy supports)</span>
                </div>
              </div>
            )}
          </div>

          {hasValidWeight && (
            <div className="flex items-center gap-2.5 rounded-lg border border-[#ff5e1e]/30 bg-[#ff5e1e]/10 p-3 text-xs text-white">
              <Scale className="h-4 w-4 text-[#ff5e1e] shrink-0" />
              <div>
                <strong>{totalFilament}g total filament estimate</strong>{' '}
                <span className="text-slate-400 text-[11px]">
                  ({weightNum}g net + {miscOverhead}g buffer)
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="text-xs bg-primary text-white hover:bg-primary/90"
              >
                Save Specs &amp; Move to {targetLabel} →
              </Button>
            </ButtonGroup>
          </div>
        </form>
      </div>
    </div>
  )
}
