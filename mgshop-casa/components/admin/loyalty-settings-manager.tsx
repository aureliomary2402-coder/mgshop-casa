"use client"

import { useState, useEffect } from 'react'
import { Gift, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LoyaltySettings {
  points_per_euro: number
  points_threshold: number
  reward_description: string
  is_active: boolean
}

export function LoyaltySettingsManager() {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/loyalty-settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false) })
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/admin/loyalty-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>
  if (!settings) return null

  const euroPerPoint = settings.points_per_euro > 0 ? Math.round(1 / settings.points_per_euro) : 0
  const euroToReward = settings.points_per_euro > 0 ? Math.round(settings.points_threshold / settings.points_per_euro) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: settings.is_active ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: settings.is_active ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">Programma Fedeltà</p>
          <p className="text-xs mt-0.5">
            {settings.is_active
              ? <span className="text-cyan-600 font-medium">✅ Attivo — visibile nel sito</span>
              : <span className="text-slate-400">❌ Disattivato</span>}
          </p>
        </div>
        <button onClick={() => setSettings(s => s ? { ...s, is_active: !s.is_active } : s)}
          className="focus:outline-none hover:scale-110 transition-transform">
          {settings.is_active ? <ToggleRight className="w-10 h-10 text-cyan-600"/> : <ToggleLeft className="w-10 h-10 text-slate-300"/>}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-cyan-800 mb-1 flex items-center gap-2"><Gift className="w-4 h-4"/> Anteprima regole</p>
        <p className="text-cyan-700">• 1 punto ogni <strong>{euroPerPoint}€</strong> spesi</p>
        <p className="text-cyan-700">• Raggiungi <strong>{settings.points_threshold} punti</strong> spendendo <strong>{euroToReward}€</strong></p>
        <p className="text-cyan-700">• Premio: <strong>{settings.reward_description}</strong></p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Punti per ogni euro speso</label>
          <Input
            type="number" step="0.01" min="0.01"
            value={settings.points_per_euro}
            onChange={e => setSettings(s => s ? { ...s, points_per_euro: parseFloat(e.target.value) || 0 } : s)}
          />
          <p className="text-xs text-slate-400 mt-1">Es. 0.1 = 1 punto ogni 10€ · 0.5 = 1 punto ogni 2€ · 1 = 1 punto ogni 1€</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Punti necessari per il premio</label>
          <Input
            type="number" min="1"
            value={settings.points_threshold}
            onChange={e => setSettings(s => s ? { ...s, points_threshold: parseInt(e.target.value) || 0 } : s)}
          />
          <p className="text-xs text-slate-400 mt-1">Es. 10 = 10 punti per ricevere il premio</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Descrizione premio</label>
          <textarea
            value={settings.reward_description}
            onChange={e => setSettings(s => s ? { ...s, reward_description: e.target.value } : s)}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Es. Sconto €5 sul prossimo ordine, prodotto omaggio..."
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700">
        <Save className="w-4 h-4"/>
        {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva impostazioni'}
      </Button>
    </div>
  )
}
