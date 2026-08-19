export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

// Una singola opzione di personalizzazione definita dall'admin sul prodotto
// (es. "Colore" a scelta multipla, oppure "Scritta" a testo libero).
export interface CustomizationOption {
  id: string
  label: string
  type: 'select' | 'text'
  required: boolean
  choices?: string[]
  placeholder?: string
}

// Scelta del cliente per una singola opzione: teniamo anche l'etichetta e il
// valore "fotografati" al momento dell'acquisto, così l'ordine resta leggibile
// anche se in futuro l'admin cambia o rimuove quell'opzione dal prodotto.
export interface CustomizationSelection {
  option_id: string
  label: string
  value: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  cover_image: string | null
  card_image?: string | null
  is_active: boolean
  stock: number | null
  torna_presto?: boolean
  is_customizable?: boolean
  customization_options?: CustomizationOption[]
  // Testo introduttivo mostrato al cliente sopra le opzioni di
  // personalizzazione (es. "Scrivi il nome da ricamare e scegli il colore
  // della base"). Facoltativo: se vuoto non compare nulla.
  customization_note?: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  display_order: number
  created_at: string
  // 'video' per i filmati caricati in galleria (mp4/webm/mov...). Le righe
  // già esistenti non hanno questo campo: vanno trattate come immagine.
  media_type?: 'image' | 'video'
}

export interface Banner {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface Order {
  id: string
  phone_number: string
  status: string
  total: number
  customer_name?: string
  created_at: string
  delivery_method?: 'ritiro' | 'consegna'
  delivery_address?: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  created_at: string
  customization?: CustomizationSelection[] | null
  is_customized?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
  // Presente solo per i prodotti personalizzabili: le scelte fatte dal
  // cliente prima di aggiungere al carrello.
  customization?: CustomizationSelection[]
  // Identificativo della riga nel carrello. Di norma coincide con
  // product.id, ma per i prodotti personalizzati include anche le scelte
  // fatte, così due configurazioni diverse dello stesso prodotto restano
  // righe separate invece di sommarsi.
  lineId?: string
}

export interface Review {
  id: string
  customer_name: string
  phone_number?: string | null
  rating: number
  comment: string
  admin_reply?: string | null
  admin_reply_at?: string | null
  created_at: string
}
