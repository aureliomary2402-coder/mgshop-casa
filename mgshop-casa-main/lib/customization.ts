import type { CustomizationChoice, CustomizationOption, CustomizationSelection, Product } from './types'

// Id univoco per una nuova opzione di personalizzazione (usato solo lato admin)
export function createCustomizationOptionId(): string {
  return crypto.randomUUID()
}

// I prodotti creati prima dell'introduzione del prezzo per scelta hanno
// choices come semplice array di stringhe: qui li convertiamo tutti nella
// forma { value, price? } così il resto del codice non deve preoccuparsene.
export function normalizeChoices(choices?: (CustomizationChoice | string)[]): CustomizationChoice[] {
  if (!choices) return []
  return choices.map(c => typeof c === 'string' ? { value: c } : c)
}

// Calcola il prezzo del prodotto in base alle scelte di personalizzazione
// fatte dal cliente: se il cliente ha selezionato una scelta con un prezzo
// impostato dall'admin, quel prezzo sostituisce il prezzo base del prodotto
// (non si somma). Se il prodotto ha più opzioni con prezzi propri, i loro
// prezzi si sommano tra loro (caso raro: di norma un prodotto ha una sola
// opzione "a prezzo variabile", le altre sono solo descrittive).
export function computeCustomizedPrice(product: Product, options: CustomizationOption[], values: Record<string, string>): number {
  let pricedTotal = 0
  let hasPricedSelection = false
  for (const opt of options) {
    if (opt.type !== 'select') continue
    const selectedValue = values[opt.id]
    if (!selectedValue) continue
    const choice = normalizeChoices(opt.choices).find(c => c.value === selectedValue)
    if (choice && typeof choice.price === 'number') {
      pricedTotal += choice.price
      hasPricedSelection = true
    }
  }
  return hasPricedSelection ? pricedTotal : product.price
}

// Prezzo minimo possibile per un prodotto personalizzabile, da mostrare nella
// card prodotto prima ancora che il cliente scelga qualcosa (es. "da €10").
// Se nessuna opzione ha prezzi propri, torna semplicemente il prezzo base.
export function getMinCustomizedPrice(product: Product): number {
  const options = product.customization_options || []
  let pricedTotal = 0
  let hasPricedOption = false
  for (const opt of options) {
    if (opt.type !== 'select') continue
    const prices = normalizeChoices(opt.choices).map(c => c.price).filter((p): p is number => typeof p === 'number')
    if (prices.length > 0) {
      pricedTotal += Math.min(...prices)
      hasPricedOption = true
    }
  }
  return hasPricedOption ? pricedTotal : product.price
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

// Trova la foto da mostrare in base alla scelta fatta dal cliente (se una
// delle opzioni a scelta multipla ha una foto impostata sulla scelta
// selezionata). Se più opzioni hanno una foto, vince l'ultima selezionata
// nell'ordine in cui sono definite le opzioni sul prodotto.
export function getSelectedChoiceImage(options: CustomizationOption[], values: Record<string, string>): string | null {
  let found: string | null = null
  for (const opt of options) {
    if (opt.type !== 'select') continue
    const selectedValue = values[opt.id]
    if (!selectedValue) continue
    const choice = normalizeChoices(opt.choices).find(c => c.value === selectedValue)
    if (choice?.image_url) found = choice.image_url
  }
  return found
}
// Converte le scelte correnti (mappa option_id -> valore) nello snapshot da
// salvare nel carrello/ordine, scartando le opzioni lasciate vuote e non obbligatorie.
// Se la scelta ha un prezzo impostato, viene "fotografato" qui insieme al resto.
export function buildCustomizationSelections(options: CustomizationOption[], values: Record<string, string>): CustomizationSelection[] {
  return options
    .filter(opt => values[opt.id]?.trim())
    .map(opt => {
      const value = values[opt.id].trim()
      const choice = opt.type === 'select' ? normalizeChoices(opt.choices).find(c => c.value === value) : undefined
      return {
        option_id: opt.id,
        label: opt.label,
        value,
        ...(choice && typeof choice.price === 'number' ? { price: choice.price } : {}),
      }
    })
}
