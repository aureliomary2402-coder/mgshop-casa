"use client"
import { useState } from 'react'
import { Star } from 'lucide-react'

// Sola lettura: mostra il punteggio (usato nell'elenco recensioni e ovunque
// serva riepilogare una valutazione già data).
export function StarRatingDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} su 5 stelle`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          width={size}
          height={size}
          style={{ color: n <= Math.round(rating) ? '#f59e0b' : '#e2e8f0' }}
          fill={n <= Math.round(rating) ? '#f59e0b' : 'none'}
        />
      ))}
    </div>
  )
}

// Interattivo: usato nel form di invio recensione, il cliente tocca/clicca
// la stella per scegliere il voto da 1 a 5.
export function StarRatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Valutazione da 1 a 5 stelle">
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= (hover || value)
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} stelle`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="btn-press p-1 -m-1"
          >
            <Star
              width={32}
              height={32}
              style={{ color: filled ? '#f59e0b' : '#e2e8f0', transition: 'color 0.15s' }}
              fill={filled ? '#f59e0b' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}
