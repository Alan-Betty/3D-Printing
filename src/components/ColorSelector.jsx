import React, { useRef, useMemo } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { InputGroup, InputLeftElement } from '@/components/ui/input-group'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Palette, Pipette } from 'lucide-react'

export const PRESET_PAINTS = [
  { name: 'Jet Black', code: '#111111' },
  { name: 'Titanium White', code: '#ffffff' },
  { name: 'Primer Grey', code: '#94a3b8' },
  { name: 'Slate Grey', code: '#64748b' },
  { name: 'Signal Red', code: '#ef4444' },
  { name: 'Cyber Crimson', code: '#b91c1c' },
  { name: 'Neon Cyan', code: '#00f0ff' },
  { name: 'Laser Teal', code: '#05d5b3' },
  { name: 'Emerald Green', code: '#10b981' },
  { name: 'Olive Drab', code: '#4d7c0f' },
  { name: 'Tangerine Orange', code: '#ff5e1e' },
  { name: 'Sunburst Yellow', code: '#eab308' },
  { name: 'Electric Purple', code: '#8b5cf6' },
  { name: 'Royal Blue', code: '#2563eb' },
  { name: 'Silk Gold', code: '#d97706' },
  { name: 'Metallic Silver', code: '#cbd5e1' },
  { name: 'Copper Bronze', code: '#b45309' },
]

export function ColorSelector({
  label,
  name = '',
  code = '',
  onChange,
  optional = false,
  role = '',
}) {
  const colorInputRef = useRef(null)

  const handlePresetSelect = (preset) => {
    onChange({
      name: preset.name,
      code: preset.code,
    })
  }

  const handleNativeColorPick = (e) => {
    const pickedHex = e.target.value
    const matchedPreset = PRESET_PAINTS.find(
      (p) => p.code.toLowerCase() === pickedHex.toLowerCase()
    )
    onChange({
      name: matchedPreset ? matchedPreset.name : (name || 'Custom Shade'),
      code: pickedHex,
    })
  }

  const handleNameChange = (e) => {
    onChange({
      name: e.target.value,
      code: code || '#ff5e1e',
    })
  }

  // Combobox options
  const comboboxOptions = useMemo(() => {
    const opts = PRESET_PAINTS.map((p) => ({
      value: p.name,
      label: p.name,
      code: p.code,
    }))
    if (optional) {
      opts.unshift({ value: '__none__', label: 'None / Unspecified', code: 'transparent' })
    }
    return opts
  }, [optional])

  const selectedValue = useMemo(() => {
    if (!name && !code) return optional ? '__none__' : ''
    const found = PRESET_PAINTS.find((p) => p.name === name || p.code.toLowerCase() === (code || '').toLowerCase())
    return found ? found.name : name
  }, [name, code, optional])

  const handleComboboxChange = (val) => {
    if (val === '__none__') {
      onChange({ name: '', code: '' })
      return
    }
    const matched = PRESET_PAINTS.find((p) => p.name === val)
    if (matched) {
      handlePresetSelect(matched)
    } else if (val) {
      onChange({ name: val, code: code || '#ff5e1e' })
    }
  }

  return (
    <Field className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel className="text-xs font-semibold text-slate-200">
          {label} {optional && <span className="font-normal text-slate-500">(Optional)</span>}
        </FieldLabel>
        {role && (
          <Badge variant="cyan" className="py-0 px-2 font-mono text-[10px]">
            {role}
          </Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="flex items-center gap-2">
          {/* Color preview square & native picker trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-900 transition-all hover:scale-105 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                style={{
                  backgroundColor: code || '#111111',
                  boxShadow: code ? `0 0 12px ${code}44` : 'none',
                }}
                aria-label={`Open color picker (current: ${name || code || 'none'})`}
              >
                {!code ? (
                  <Palette className="h-4 w-4 text-slate-400" />
                ) : (
                  <Pipette className="h-3.5 w-3.5 text-white/70 drop-shadow mix-blend-difference" />
                )}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={code && code.startsWith('#') && code.length === 7 ? code : '#ff5e1e'}
                  onChange={handleNativeColorPick}
                  className="sr-only"
                  aria-label="Pick custom hex color code"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-medium">{name || 'Custom Shade'}</span>{' '}
              <span className="font-mono text-slate-400">{code || '#111111'}</span>
            </TooltipContent>
          </Tooltip>

          {/* Combobox for shades */}
          <div className="flex-1 min-w-[200px]">
            <Combobox
              options={comboboxOptions}
              value={selectedValue}
              onChange={handleComboboxChange}
              placeholder={optional ? 'Select shade (optional)...' : 'Select paint or filament shade...'}
              searchPlaceholder="Search shades or palettes..."
              className="h-10 text-xs"
              renderItem={(opt) => (
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: opt.code }}
                  />
                  <span>{opt.label}</span>
                </div>
              )}
            />
          </div>
        </div>

        {/* Custom Name Override Input */}
        <div className="sm:w-56 shrink-0">
          <InputGroup>
            <InputLeftElement>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: code || '#64748b' }}
              />
            </InputLeftElement>
            <Input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Custom shade name"
              className="pl-7 h-10 text-xs border-slate-700 bg-slate-900/80"
              title="Custom color or filament name"
            />
          </InputGroup>
        </div>
      </div>

      {/* Quick 1-click popular shades row with Tooltips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {PRESET_PAINTS.slice(0, 14).map((preset) => {
          const isSelected = code?.toLowerCase() === preset.code.toLowerCase()
          return (
            <Tooltip key={preset.name}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`h-5 w-5 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? 'scale-125 ring-2 ring-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                      : 'hover:scale-115 opacity-80 hover:opacity-100 ring-1 ring-white/20'
                  }`}
                  style={{ backgroundColor: preset.code }}
                  aria-label={`${preset.name} (${preset.code})`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px] py-1 px-2">
                <span>{preset.name}</span>{' '}
                <span className="font-mono text-slate-400">({preset.code})</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </Field>
  )
}
