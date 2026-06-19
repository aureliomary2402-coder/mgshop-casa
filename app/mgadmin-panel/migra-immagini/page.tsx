"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, ImageIcon, ArrowRight, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  products: number
  product_images: number
  banners: number
  total: number
}

interface Result {
  success: number
  failed: number
  skipped: number
  total: number
  errors: string[]
}

export default function MigraImmaginiPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    const res = await fetch('/api/admin/migrate-images')
    if (res.ok) setStats(await res.json())
    setLoadingStats(false)
  }

  const handleMigrate = async () => {
    if (!confirm(`Migrare ${stats?.total} immagini da Vercel Blob a Supabase Storage? L'operazione può richiedere qualche minuto.`)) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/migrate-images', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      fetchStats()
    } catch {
      alert('Errore durante la migrazione')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-3">
        <Link href="/mgadmin-panel" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-bold text-stone-800">Migrazione Immagini</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Spiegazione */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-semibold text-amber-800 mb-1">Cosa fa questa pagina</h2>
          <p className="text-sm text-amber-700">
            Scarica tutte le immagini da Vercel Blob e le ricarica su Supabase Storage.
            Dopo la migrazione le immagini funzioneranno sempre, senza limiti.
          </p>
        </div>

        {/* Conteggio immagini da migrare */}
        <div className="bg-white border border-stone-100 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" />
            Immagini da migrare
          </h2>
          {loadingStats ? (
            <p className="text-stone-400 text-sm">Controllo in corso...</p>
          ) : stats ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Copertine prodotti</span>
                <span className="font-medium">{stats.products}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Gallerie prodotti</span>
                <span className="font-medium">{stats.product_images}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Banner</span>
                <span className="font-medium">{stats.banners}</span>
              </div>
              <div className="border-t border-stone-100 pt-2 flex justify-between font-bold">
                <span>Totale</span>
                <span className="text-amber-700">{stats.total}</span>
              </div>
            </div>
          ) : (
            <p className="text-stone-400 text-sm">Errore nel caricamento</p>
          )}
        </div>

        {/* Bottone migrazione */}
        {stats && stats.total > 0 && !result && (
          <button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Migrazione in corso... (può richiedere qualche minuto)
              </>
            ) : (
              <>
                Avvia migrazione
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}

        {stats && stats.total === 0 && !result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-green-700 font-medium text-sm">Tutte le immagini sono già su Supabase Storage!</p>
          </div>
        )}

        {/* Risultato */}
        {result && (
          <div className="bg-white border border-stone-100 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-stone-800">Risultato migrazione</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-green-700 mt-1">Migrate</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                <p className="text-xs text-red-600 mt-1">Fallite</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-stone-500">{result.skipped}</p>
                <p className="text-xs text-stone-500 mt-1">Saltate</p>
              </div>
            </div>

            {result.success > 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm font-medium">{result.success} immagini migrate con successo!</p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">Immagini non migrate ({result.errors.length})</p>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
                {result.failed > 0 && (
                  <button onClick={handleMigrate} disabled={loading} className="mt-3 text-sm text-red-700 font-medium underline">
                    Riprova le fallite
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-stone-400 text-center">
          Le immagini non raggiungibili (URL scaduti) verranno saltate automaticamente.
        </p>
      </div>
    </div>
  )
}
