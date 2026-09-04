"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, Store, Shield, Eye, ArrowUp, ArrowDown, BarChart2, CalendarDays } from 'lucide-react'

interface VisitItem {
  page: string
  created_at: string
}

interface VisitLogData {
  store: { total: number; items: VisitItem[] }
  admin: { total: number; items: VisitItem[] }
}

interface AnalyticsData {
  total: number
  today: number
  yesterday: number
  last7: number
  last30: number
  topPages: { page: string; count: number }[]
  last7Days: { day: string; count: number }[]
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

function pageLabel(page: string) {
  const labels: Record<string, string> = {
    '/': 'Home',
    '/shop': 'Negozio',
    '/promo': 'Promo',
    '/carrello': 'Carrello',
  }
  if (labels[page]) return labels[page]
  if (page.startsWith('/prodotto/')) return 'Scheda prodotto'
  return page
}

function MiniChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max((d.count / max) * 44, 2)}px`,
              background: i === data.length - 1 ? 'linear-gradient(135deg,#0891b2,#06b6d4)' : 'rgba(8,145,178,0.2)'
            }} />
        </div>
      ))}
    </div>
  )
}

export function VisitLogManager() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<VisitLogData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [subTab, setSubTab] = useState<'store' | 'admin'>('store')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [s, l, a] = await Promise.all([
      fetch('/api/admin/visit-notifications').then(r => r.json()),
      fetch('/api/admin/visit-log').then(r => r.json()),
      fetch('/api/admin/analytics').then(r => r.json()),
    ])
    if (typeof s.enabled === 'boolean') setEnabled(s.enabled)
    setData(l)
    setAnalytics(a)
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
  const todayVsYesterday = analytics ? analytics.today - analytics.yesterday : 0

  return (
    <div className="space-y-6">

      {/* Visita giornaliera */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-600" /> Visita giornaliera
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm col-span-2">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-3xl font-bold text-slate-800">{analytics?.today ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Visite oggi</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${todayVsYesterday >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {todayVsYesterday >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(todayVsYesterday)} vs ieri
              </div>
            </div>
            {analytics && <MiniChart data={analytics.last7Days} />}
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {analytics?.last7Days.map((d, i) => (
                <span key={i}>{new Date(d.day).toLocaleDateString('it-IT', { weekday: 'short' })}</span>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xl font-bold text-slate-800">{analytics?.yesterday ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Ieri</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xl font-bold text-slate-800">{analytics?.last7 ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">7 giorni</p>
          </div>
        </div>
      </div>

      {/* Mensile */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-cyan-600" /> Mensile
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xl font-bold text-slate-800">{analytics?.last30 ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">30 giorni</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xl font-bold text-slate-800">{analytics?.total ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Totale</p>
          </div>
        </div>
      </div>

      {/* Pagine visitate */}
      {analytics && analytics.topPages.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-600" /> Pagine visitate
          </h2>
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-3">Pagine più visitate (30gg)</p>
            <div className="space-y-2">
              {analytics.topPages.map(({ page, count }) => {
                const pct = Math.round((count / (analytics.topPages[0]?.count || 1)) * 100)
                return (
                  <div key={page} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{pageLabel(page)}</span>
                      <span className="font-medium text-slate-600">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0891b2,#06b6d4)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Log delle 48 ore */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-600" /> Log delle 48 ore
        </h2>

        <div className="flex items-center justify-between p-4 rounded-2xl border mb-3"
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

        <div className="grid grid-cols-2 gap-3 mb-3">
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

        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <Eye className="w-3.5 h-3.5" /> Ultime visite {subTab === 'store' ? 'al negozio' : 'al pannello admin'}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {!list || list.items.length === 0 ? (
              <p className="text-center py-6 text-sm text-slate-400">Nessuna visita registrata</p>
            ) : (
              list.items.map((v, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate">{v.page}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-3">{timeAgo(v.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">Il registro si svuota automaticamente ogni 48 ore.</p>
      </div>
    </div>
  )
}
