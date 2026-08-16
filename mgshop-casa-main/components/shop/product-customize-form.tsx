"use client"

import type { CustomizationOption } from '@/lib/types'

interface Props {
  options: CustomizationOption[]
  values: Record<string, string>
  onChange: (optionId: string, value: string) => void
  note?: string | null
}

// Form mostrato sui prodotti personalizzabili (dettaglio prodotto): il
// cliente sceglie colore/dimensione/altro prima di poter aggiungere al
// carrello. Usato sia nel modale sia nella pagina prodotto a tutto schermo.
export function ProductCustomizeForm({ options, values, onChange, note }: Props) {
  if (!options || options.length === 0) return null

  return (
    <div className="space-y-4 rounded-2xl p-4" style={{ background: 'rgba(217,70,239,0.05)', border: '1px solid rgba(217,70,239,0.15)' }}>
      {note && note.trim() && (
        <p className="text-sm leading-relaxed" style={{ color: '#701a75' }}>{note}</p>
      )}
      {options.map(opt => (
        <div key={opt.id}>
          <label className="text-sm font-semibold block mb-2" style={{ color: '#041C33' }}>
            {opt.label}{opt.required && <span className="text-fuchsia-500 ml-0.5">*</span>}
          </label>
          {opt.type === 'select' ? (
            <div className="flex flex-wrap gap-2">
              {(opt.choices || []).map(choice => {
                const selected = values[opt.id] === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => onChange(opt.id, choice)}
                    className="px-3.5 py-2 rounded-full text-sm font-medium transition-all btn-press"
                    style={selected
                      ? { background: 'linear-gradient(135deg,#d946ef,#c026d3)', color: 'white' }
                      : { background: 'white', border: '1px solid rgba(217,70,239,0.25)', color: '#701a75' }}>
                    {choice}
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={values[opt.id] || ''}
              onChange={e => onChange(opt.id, e.target.value)}
              placeholder={opt.placeholder || ''}
              rows={2}
              className="w-full rounded-xl p-3 text-sm outline-none resize-none"
              style={{ background: 'white', border: '1px solid rgba(217,70,239,0.25)', color: '#041C33' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
