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
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" />
      <path d="M11 44 L32 24 L53 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="44" x2="14" y2="53" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="44" x2="50" y2="53" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="22" y="15" width="20" height="16" rx="4" stroke="currentColor" strokeWidth="2.75" />
      <path d="M25.5 15 A6.5 8 0 0 1 38.5 15" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  )
}
