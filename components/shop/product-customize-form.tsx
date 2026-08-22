"use client"

import { Check } from 'lucide-react'
import type { CustomizationOption } from '@/lib/types'
import { normalizeChoices } from '@/lib/customization'

interface Props {
  options: CustomizationOption[]
  values: Record<string, string | string[]>
  onChange: (optionId: string, value: string | string[]) => void
  note?: string | null
}

// Form mostrato sui prodotti personalizzabili (dettaglio prodotto): il
// cliente sceglie colore/dimensione/altro prima di poter aggiungere al
// carrello. Usato sia nel modale sia nella pagina prodotto a tutto schermo.
// Per le opzioni "a scelta" (select) si possono selezionare più pulsanti
// insieme (es. sia "12 pz" che "24 pz"): al momento di aggiungere al
// carrello, ogni scelta selezionata diventa una riga separata con il suo
// prezzo, così il cliente può comprare più varianti in un colpo solo.
export function ProductCustomizeForm({ options, values, onChange, note }: Props) {
  if (!options || options.length === 0) return null

  return (
    <div className="space-y-4 rounded-2xl p-4" style={{ background: 'rgba(217,70,239,0.05)', border: '1px solid rgba(217,70,239,0.15)' }}>
      {note && note.trim() && (
        <p className="text-sm leading-relaxed" style={{ color: '#701a75' }}>{note}</p>
      )}
      {options.map(opt => {
        const selectedValues = Array.isArray(values[opt.id]) ? (values[opt.id] as string[]) : []
        return (
        <div key={opt.id}>
          <label className="text-sm font-semibold block mb-2" style={{ color: '#0c2b36' }}>
            {opt.label}{opt.required && <span className="text-fuchsia-500 ml-0.5">*</span>}
          </label>
          {opt.type === 'select' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {normalizeChoices(opt.choices).map(choice => {
                  const selected = selectedValues.includes(choice.value)
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => onChange(opt.id, selected
                        ? selectedValues.filter(v => v !== choice.value)
                        : [...selectedValues, choice.value])}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all btn-press"
                      style={selected
                        ? { background: 'linear-gradient(135deg,#d946ef,#c026d3)', color: 'white' }
                        : { background: 'white', border: '1px solid rgba(217,70,239,0.25)', color: '#701a75' }}>
                      {selected && <Check className="w-3.5 h-3.5" />}
                      {choice.value}{typeof choice.price === 'number' && ` – €${choice.price.toFixed(2)}`}
                    </button>
                  )
                })}
              </div>
              {normalizeChoices(opt.choices).length > 1 && (
                <p className="text-[11px] mt-1.5" style={{ color: '#a21caf' }}>Puoi selezionarne più di una: verranno aggiunte al carrello separatamente</p>
              )}
            </>
          ) : (
            <textarea
              value={typeof values[opt.id] === 'string' ? values[opt.id] as string : ''}
              onChange={e => onChange(opt.id, e.target.value)}
              placeholder={opt.placeholder || ''}
              rows={2}
              className="w-full rounded-xl p-3 text-sm outline-none resize-none"
              style={{ background: 'white', border: '1px solid rgba(217,70,239,0.25)', color: '#0c2b36' }}
            />
          )}
        </div>
        )
      })}
    </div>
  )
}
