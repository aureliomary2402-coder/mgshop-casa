"use client"

import { useSiteTheme } from '@/components/site-theme-provider'

// Le tre zucche dell'hero: si vedono solo con il tema Halloween.
export function HeroPumpkins() {
  const theme = useSiteTheme()
  if (theme !== 'halloween') return null
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-3 select-none text-5xl leading-none -rotate-6 sm:text-7xl">🎃</span>
      <span aria-hidden="true" className="pointer-events-none absolute left-1 top-[46%] select-none text-4xl leading-none rotate-12 sm:text-6xl">🎃</span>
      <span aria-hidden="true" className="pointer-events-none absolute right-2 top-24 select-none text-3xl leading-none rotate-6 sm:text-5xl">🎃</span>
    </>
  )
}
