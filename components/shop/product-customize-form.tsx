"use client"

import { useState } from 'react'
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
// Per le opzioni "a scelta" (select), di default si può selezionare un solo
// tipo (click su un'altra scelta sostituisce quella precedente, come un
// gruppo di radio button). Se il cliente vuole comprare più tipi in un
// colpo solo, barra la casella "Più di una": a quel punto i pulsanti si
// comportano come toggle indipendenti e ogni scelta selezionata diventerà
// una riga separata nel carrello, con il suo prezzo.
export function ProductCustomizeForm({ options, values, onChange, note }: Props) {
  const [multiMode, setMultiMode] = useState<Record<string, boolean>>({})

  if (!options || options.length === 0) return null

  return (
    <div className="space-y-4 rounded-2xl p-4" style={{ background: 'rgba(217,70,239,0.05)', border: '1px solid rgba(217,70,239,0.15)' }}>
      {note && note.trim() && (
        <p className="text-sm leading-relaxed" style={{ color: '#701a75' }}>{note}</p>
      )}
      {options.map(opt => {
        const selectedValues = Array.isArray(values[opt.id]) ? (values[opt.id] as string[]) : []
        const choices = normalizeChoices(opt.choices)
        const isMulti = !!multiMode[opt.id]

        const toggleMulti = () => {
          const next = !isMulti
          setMultiMode(prev => ({ ...prev, [opt.id]: next }))
          // Disattivando la selezione multipla, teniamo solo la prima scelta
          // già selezionata: evita di lasciare più tipi "appesi" senza che
          // il cliente se ne accorga.
          if (!next && selectedValues.length > 1) {
            onChange(opt.id, [selectedValues[0]])
          }
        }

        const handleChoiceClick = (value: string) => {
          const selected = selectedValues.includes(value)
          if (isMulti) {
            onChange(opt.id, selected
              ? selectedValues.filter(v => v !== value)
              : [...selectedValues, value])
          } else {
            // Selezione singola: cliccare un tipo lo seleziona da solo
            // (sostituendo quello scelto prima); ricliccarlo lo deseleziona.
            onChange(opt.id, selected ? [] : [value])
          }
        }

        return (
        <div key={opt.id}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-sm font-semibold" style={{ color: '#0c2b36' }}>
              {opt.label}{opt.required && <span className="text-fuchsia-500 ml-0.5">*</span>}
            </label>
            {opt.type === 'select' && choices.length > 1 && (
              <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none shrink-0" style={{ color: '#a21caf' }}>
                <input
                  type="checkbox"
                  checked={isMulti}
                  onChange={toggleMulti}
                  className="w-3.5 h-3.5 accent-fuchsia-600"
                />
                Più di una
              </label>
            )}
          </div>
          {opt.type === 'select' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {choices.map(choice => {
                  const selected = selectedValues.includes(choice.value)
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => handleChoiceClick(choice.value)}
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
              {isMulti && (
                <p className="text-[11px] mt-1.5" style={{ color: '#a21caf' }}>Ogni scelta selezionata verrà aggiunta al carrello separatamente</p>
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
