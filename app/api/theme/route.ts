import { NextResponse } from 'next/server'
import { getActiveTheme } from '@/lib/site-theme-server'

export const dynamic = 'force-dynamic'

// Il sito chiede qui il tema in vigore (tiene allineati anche i telefoni
// che hanno la pagina aperta quando scatta il cambio).
export async function GET() {
  const theme = await getActiveTheme()
  return NextResponse.json({ theme }, { headers: { 'Cache-Control': 'no-store' } })
}
