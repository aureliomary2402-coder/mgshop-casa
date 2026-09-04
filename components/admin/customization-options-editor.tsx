"use client"

import { useState } from 'react'
import { Plus, Trash2, ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CustomizationOption, CustomizationChoice } from '@/lib/types'
import { createCustomizationOptionId, normalizeChoices } from '@/lib/customization'
import { compressImageFile } from '@/lib/image'

export function emptyOption(): CustomizationOption {
  return { id: createCustomizationOptionId(), label: '', type: 'select', required: true, choices: [] }
}

export function emptyChoice(): CustomizationChoice {
  return { value: '' }
}

// Editor delle scelte di un'opzione "a scelta multipla" (es. Rosso, Blu...),
// una riga per scelta con un prezzo e una foto facoltativi: se il prezzo è
// impostato, quando il cliente sceglie quella scelta il prezzo del prodotto
// diventa quello (al posto del prezzo base); se la foto è impostata, sostituisce
// la foto principale del prodotto quando il cliente sceglie quella scelta.
function ChoicesEditor({ choices, onChange }: { choices?: (CustomizationChoice | string)[]; onChange: (choices: CustomizationChoice[]) => void }) {
  const list = normalizeChoices(choices)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const updateChoice = (idx: number, patch: Partial<CustomizationChoice>) => {
    onChange(list.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  const removeChoice = (idx: number) => onChange(list.filter((_, i) => i !== idx))
  const addChoice = () => onChange([...list, emptyChoice()])

  const handlePhotoSelect = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingIdx(idx)
    try {
      const compressed = await compressImageFile(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) updateChoice(idx, { image_url: data.url })
      else console.error('Upload foto scelta fallito:', data.error)
    } catch (e) { console.error('Upload foto scelta fallito', e) }
    setUploadingIdx(null)
  }

  return (
    <div className="space-y-2">
      {list.map((choice, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50 flex items-center justify-center">
            {choice.image_url ? (
              <img src={choice.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-slate-300" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => handlePhotoSelect(idx, e)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploadingIdx === idx}
            />
          </div>
          <Input
            value={choice.value}
            onChange={e => updateChoice(idx, { value: e.target.value })}
            placeholder="Es. Piccola"
            className="flex-1"
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
            <Input
              type="number"
              step="0.01"
              value={choice.price ?? ''}
              onChange={e => updateChoice(idx, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="uguale"
              className="pl-5"
            />
          </div>
          <button onClick={() => removeChoice(idx)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addChoice} className="gap-1">
        <Plus className="w-4 h-4" /> Aggiungi scelta
      </Button>
      <p className="text-[11px] text-slate-400">
        Il cliente vedrà queste scelte come pulsanti. Lascia il prezzo vuoto per usare il prezzo base del prodotto; scrivilo (es. 18) se questa scelta deve costare un prezzo diverso. Tocca il quadratino a sinistra per caricare una foto: se impostata, sostituisce la foto principale quando il cliente sceglie quella scelta.
      </p>
    </div>
  )
}

// Editor delle opzioni di personalizzazione (colore, dimensione, testo libero...),
// identico a quello usato per i prodotti del negozio: riutilizzato qui perché
// anche i prodotti creati apposta per una promo possano avere scelte con
// prezzi diversi, esattamente come un prodotto normale del catalogo.
export function CustomizationOptionsEditor({ options, onChange }: { options: CustomizationOption[]; onChange: (opts: CustomizationOption[]) => void }) {
  const updateOption = (id: string, patch: Partial<CustomizationOption>) => {
    onChange(options.map(o => o.id === id ? { ...o, ...patch } : o))
  }
  const removeOption = (id: string) => onChange(options.filter(o => o.id !== id))
  const addOption = () => onChange([...options, emptyOption()])

  return (
    <div className="space-y-3">
      {options.map((opt, idx) => (
        <div key={opt.id} className="rounded-xl border border-cyan-100 bg-cyan-50/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={opt.label}
              onChange={e => updateOption(opt.id, { label: e.target.value })}
              placeholder={`Nome opzione ${idx + 1} (es. Colore, Dimensione, Scritta...)`}
              className="flex-1"
            />
            <button onClick={() => removeOption(opt.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <div className="flex items-center gap-4 pl-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="radio" checked={opt.type === 'select'} onChange={() => updateOption(opt.id, { type: 'select' })} />
              Scelta tra opzioni
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="radio" checked={opt.type === 'text'} onChange={() => updateOption(opt.id, { type: 'text' })} />
              Testo libero
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-auto">
              <input type="checkbox" checked={opt.required} onChange={e => updateOption(opt.id, { required: e.target.checked })} />
              Obbligatoria
            </label>
          </div>
          {opt.type === 'select' ? (
            <div className="pl-1">
              <ChoicesEditor choices={opt.choices} onChange={choices => updateOption(opt.id, { choices })} />
            </div>
          ) : (
            <div className="pl-1">
              <Input
                value={opt.placeholder || ''}
                onChange={e => updateOption(opt.id, { placeholder: e.target.value })}
                placeholder="Testo di esempio nel campo (facoltativo, es. Scrivi qui la scritta da ricamare)"
              />
            </div>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addOption} className="gap-1">
        <Plus className="w-4 h-4" /> Aggiungi opzione
      </Button>
      {options.length === 0 && (
        <p className="text-xs text-slate-400">Nessuna opzione ancora. Aggiungine una (es. Colore, Dimensione) perché il cliente possa personalizzare il prodotto prima di aggiungerlo al carrello.</p>
      )}
    </div>
  )
}
