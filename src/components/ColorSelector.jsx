import { useRef } from 'react'

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
  name,
  code,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="form-label">
          {label} {optional && <span className="form-label-opt">(Optional)</span>}
        </label>
        {role && (
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {role}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Color preview square & native picker trigger */}
        <div
          onClick={() => colorInputRef.current?.click()}
          title="Click to open color picker palette"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: code || '#111111',
            border: '2px solid var(--line-light)',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: code ? `0 0 10px ${code}33` : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {!code && <span style={{ fontSize: '14px' }}>🎨</span>}
          <input
            ref={colorInputRef}
            type="color"
            value={code && code.startsWith('#') && code.length === 7 ? code : '#ff5e1e'}
            onChange={handleNativeColorPick}
            style={{ opacity: 0, width: 0, height: 0, pointerEvents: 'none', position: 'absolute' }}
            aria-label="Pick color code"
          />
        </div>

        {/* Preset Select Dropdown */}
        <select
          value={
            PRESET_PAINTS.some((p) => p.name === name || p.code === code)
              ? PRESET_PAINTS.find((p) => p.name === name || p.code === code)?.name || ''
              : ''
          }
          onChange={(e) => {
            const selected = PRESET_PAINTS.find((p) => p.name === e.target.value)
            if (selected) handlePresetSelect(selected)
            else if (e.target.value === 'custom') {
              colorInputRef.current?.click()
            }
          }}
          style={{ flex: 1 }}
          aria-label={`${label} preset selection`}
        >
          <option value="">{optional ? 'None / Select Filament or Paint Shade...' : 'Select Filament or Paint Shade...'}</option>
          {PRESET_PAINTS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="custom">🎨 Custom Palette / Color Wheel...</option>
        </select>

        {/* Custom Name Override Input */}
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Color name (optional edit)"
          style={{ width: '180px' }}
          title="Custom color or filament name"
        />
      </div>

      {/* Quick 1-click popular shades row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
        {PRESET_PAINTS.slice(0, 12).map((preset) => {
          const isSelected = code?.toLowerCase() === preset.code.toLowerCase()
          return (
            <button
              key={preset.name}
              type="button"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: preset.code,
                border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isSelected ? `0 0 8px ${preset.code}` : 'none',
                transform: isSelected ? 'scale(1.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => handlePresetSelect(preset)}
              title={`${preset.name} (${preset.code})`}
            />
          )
        })}
      </div>
    </div>
  )
}
