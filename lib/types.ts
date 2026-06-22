export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  cover_image: string | null
  is_active: boolean
  stock: number | null
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
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}
