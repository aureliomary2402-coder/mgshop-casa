import { CartContent } from '@/components/shop/cart-content'

export default function CartPage({ searchParams }: { searchParams: { promo?: string } }) {
  const scope = searchParams?.promo ? 'promo' : 'shop'
  return <CartContent scope={scope} />
}
