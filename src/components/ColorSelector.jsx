import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'

export function ColorSelector({
  label,
  name = '',
  code = '',
  onChange,
  optional = false,
}) {
  const colorValue = /^#[\da-f]{6}$/i.test(code) ? code : '#000000'

  return (
    <Field className="space-y-2">
      <FieldLabel>{label}{optional ? ' (Optional)' : ''}</FieldLabel>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 sm:grid-cols-[44px_minmax(0,1fr)_minmax(120px,180px)]">
        <input
          type="color"
          value={colorValue}
          onChange={(event) =>
            onChange({
              name: name || 'Custom color',
              code: event.target.value,
            })
          }
          aria-label={`Pick ${label.toLowerCase()}`}
          className="h-10 w-11 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          value={name}
          onChange={(event) => onChange({ name: event.target.value, code })}
          placeholder="Color name"
          aria-label={`${label} name`}
        />
        <Input
          value={code}
          onChange={(event) => onChange({ name, code: event.target.value })}
          placeholder="#000000"
          aria-label={`${label} hex code`}
          className="col-start-2 sm:col-start-auto"
        />
      </div>
    </Field>
  )
}
