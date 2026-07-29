// Versione vettoriale semplificata del logo MGShop Casa (cerchio doppio,
// casetta con borsa in cima), pensata per essere leggibile anche in piccolo,
// come "timbro" sulla scheda punti fedeltà.
export function MGShopStamp({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="1" />
      <path d="M11 44 L32 26 L53 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="11" y1="44" x2="11" y2="54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="53" y1="44" x2="53" y2="54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="23" y="17" width="18" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M26 17 A6 8 0 0 1 38 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
