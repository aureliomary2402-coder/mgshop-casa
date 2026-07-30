"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, Store, Shield, Eye } from 'lucide-react'

interface VisitItem {
  page: string
  created_at: string
}

interface VisitLogData {
  store: { total: number; items: VisitItem[] }
  admin: { total: number; items: VisitItem[] }
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min} min fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h fa`
  const d = Math.floor(h / 24)
  return `${d} g fa`
}

export function VisitLogManager() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<VisitLogData | null>(null)
  const [subTab, setSubTab] = useState<'store' | 'admin'>('store')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [s, l] = await Promise.all([
      fetch('/api/admin/visit-notifications').then(r => r.json()),
      fetch('/api/admin/visit-log').then(r => r.json()),
    ])
    if (typeof s.enabled === 'boolean') setEnabled(s.enabled)
    setData(l)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const toggle = async () => {
    if (enabled === null) return
    setSaving(true)
    const next = !enabled
    setEnabled(next)
    await fetch('/api/admin/visit-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })
    setSaving(false)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  const list = subTab === 'store' ? data?.store : data?.admin

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: enabled ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: enabled ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">Notifiche visite</p>
          <p className="text-xs mt-0.5">
            {enabled
              ? <span className="text-cyan-600 font-medium">✅ Attive — push a ogni nuova visita</span>
              : <span className="text-slate-400">❌ Disattivate</span>}
          </p>
        </div>
        <button onClick={toggle} disabled={saving} className="focus:outline-none hover:scale-110 transition-transform">
          {enabled ? <Bell className="w-8 h-8 text-cyan-600" /> : <BellOff className="w-8 h-8 text-slate-300" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setSubTab('store')}
          className={`p-4 rounded-2xl border text-left transition-colors ${subTab === 'store' ? 'border-cyan-300' : 'border-slate-100'}`}
          style={{ background: subTab === 'store' ? 'rgba(8,145,178,0.06)' : 'white' }}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Store className="w-3.5 h-3.5" /> Negozio
          </div>
          <p className="text-2xl font-bold text-slate-800">{data?.store.total ?? 0}</p>
        </button>
        <button onClick={() => setSubTab('admin')}
          className={`p-4 rounded-2xl border text-left transition-colors ${subTab === 'admin' ? 'border-cyan-300' : 'border-slate-100'}`}
          style={{ background: subTab === 'admin' ? 'rgba(8,145,178,0.06)' : 'white' }}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Shield className="w-3.5 h-3.5" /> Pannello admin
          </div>
          <p className="text-2xl font-bold text-slate-800">{data?.admin.total ?? 0}</p>
        </button>
      </div>
