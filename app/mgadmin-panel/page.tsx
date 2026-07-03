"use client"

import { useState, useEffect } from 'react'
import { Package, Tag, Image, ShoppingBag, LogOut, Lock, LayoutDashboard, Megaphone, Ticket, Menu, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductsManager } from '@/components/admin/products-manager'
import { CategoriesManager } from '@/components/admin/categories-manager'
import { BannersManager } from '@/components/admin/banners-manager'
import { OrdersManager } from '@/components/admin/orders-manager'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { PromoManager } from '@/components/admin/promo-manager'
import { CouponsManager } from '@/components/admin/coupons-manager'
import { PushNotifications } from '@/components/admin/push-notifications'

type Tab = 'dashboard' | 'products' | 'categories' | 'banners' | 'orders' | 'promo' | 'coupons'

const TABS = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50' },
  { id: 'products' as Tab, label: 'Prodotti', icon: Package, color: 'text-amber-600 bg-amber-50' },
  { id: 'categories' as Tab, label: 'Categorie', icon: Tag, color: 'text-green-600 bg-green-50' },
  { id: 'banners' as Tab, label: 'Banner', icon: Image, color: 'text-purple-600 bg-purple-50' },
  { id: 'orders' as Tab, label: 'Ordini', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
  { id: 'promo' as Tab, label: 'Promo', icon: Megaphone, color: 'text-rose-600 bg-rose-50' },
  { id: 'coupons' as Tab, label: 'Coupon', icon: Ticket, color: 'text-indigo-600 bg-indigo-50' },
]

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/auth').then(r => {
      if (r.ok) setAuthenticated(true)
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (res.ok) { setAuthenticated(true) } else { setError('Password errata') }
    setLoading(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setAuthenticated(false)
  }

  const activeTabInfo = TABS.find(t => t.id === activeTab)!

  if (checking) return <div className="min-h-screen flex items-center justify-center text-stone-400">Caricamento...</div>

  if (!authenticated) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#faf7f2' }}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm" style={{ border: '1px solid rgba(217,119,6,0.1)' }}>
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-6" style={{ color: '#1a0800' }}>Accesso Admin</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? 'Accesso...' : 'Accedi'}
          </Button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      <div className="bg-white border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40" style={{ borderColor: 'rgba(217,119,6,0.1)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
            style={{ color: '#d97706' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTabInfo.color}`}>
              <activeTabInfo.icon className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-800">{activeTabInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PushNotifications />
          <Link href="/shop" target="_blank"
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-50"
            style={{ color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }}>
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Negozio</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-2 py-1.5 rounded-lg hover:bg-stone-50">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-5 border-b border-stone-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-stone-800">MG<span style={{ color: '#d97706' }}>Shop</span> Admin</span>
                <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>
              <p className="text-xs text-stone-400">Pannello di controllo</p>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="space-y-1">
                {TABS.map(({ id, label, icon: Icon, color }) => (
                  <button key={id} onClick={() => { setActiveTab(id); setMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === id ? color : 'bg-stone-100 text-stone-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {label}
                    {activeTab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-stone-100 space-y-2">
              <Link href="/shop" target="_blank" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-amber-50"
                style={{ color: '#d97706' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.1)' }}>
                  <ExternalLink className="w-4 h-4" style={{ color: '#d97706' }} />
                </div>
                Vai al negozio
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardStats />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'promo' && <PromoManager />}
        {activeTab === 'coupons' && <CouponsManager />}
      </div>
    </div>
  )
}
