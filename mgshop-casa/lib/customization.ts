import type { CustomizationOption, CustomizationSelection } from './types'

// Id univoco per una nuova opzione di personalizzazione (usato solo lato admin)
export function createCustomizationOptionId(): string {
  return crypto.randomUUID()
}

// Id della riga carrello: per un prodotto senza personalizzazione è
// semplicemente il suo id; per un prodotto personalizzato include anche le
// scelte fatte, così configurazioni diverse restano righe separate invece
// di sommare le quantità fra loro.
export function buildCartLineId(productId: string, selections?: CustomizationSelection[]): string {
  if (!selections || selections.length === 0) return productId
  const sorted = [...selections].sort((a, b) => a.option_id.localeCompare(b.option_id))
  return `${productId}::${sorted.map(s => `${s.option_id}=${s.value}`).join('|')}`
}

// Controlla che tutte le opzioni obbligatorie del prodotto abbiano una scelta valida
export function missingRequiredOptions(options: CustomizationOption[], values: Record<string, string>): CustomizationOption[] {
  return options.filter(opt => opt.required && !values[opt.id]?.trim())
}

// Converte le scelte correnti (mappa option_id -> valore) nello snapshot da
// salvare nel carrello/ordine, scartando le opzioni lasciate vuote e non obbligatorie
export function buildCustomizationSelections(options: CustomizationOption[], values: Record<string, string>): CustomizationSelection[] {
  return options
    .filter(opt => values[opt.id]?.trim())
    .map(opt => ({ option_id: opt.id, label: opt.label, value: values[opt.id].trim() }))
}
