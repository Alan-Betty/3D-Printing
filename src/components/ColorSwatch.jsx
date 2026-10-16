import { isValidCssColor } from '../services/orderService'

export function ColorSwatch({
  name,
  code,
  finish,
  paintType,
  role = '',
  compact = false,
}) {
  const hasName = Boolean(name && name.trim())
  const hasCode = Boolean(code && code.trim())
  if (!hasName && !hasCode) return null

  const isHexOrCss = hasCode && isValidCssColor(code)
  const isNameCss = hasName && isValidCssColor(name)
  const bgStyle = isHexOrCss ? code : isNameCss ? name : '#ff5e1e'

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-full)',
          fontSize: '11px',
          color: 'var(--text-bright)',
        }}
        title={`${role ? role + ': ' : ''}${name || ''} ${code ? '(' + code + ')' : ''} ${finish ? '· ' + finish : ''}`}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: bgStyle,
            boxShadow: `0 0 6px ${bgStyle}66`,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || code}
        </span>
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        background: 'var(--bg-deep)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span
        style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: bgStyle,
          boxShadow: `0 0 10px ${bgStyle}55`,
          border: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {role && <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{role}:</span>}
          <span>{name || code}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
          {hasCode && <span style={{ fontFamily: 'var(--font-mono)' }}>{code}</span>}
          {paintType && <span>· {paintType}</span>}
          {finish && <span>· {finish}</span>}
        </div>
      </div>
    </div>
  )
}
