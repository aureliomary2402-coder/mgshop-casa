"use client"

import { useState, useEffect } from 'react'
import { Package, Tag, Image, ShoppingBag, LogOut, Lock, ArrowRightLeft, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductsManager } from '@/components/admin/products-manager'
import { CategoriesManager } from '@/components/admin/categories-manager'
import { BannersManager } from '@/components/admin/banners-manager'
import { OrdersManager } from '@/components/admin/orders-manager'
import { DashboardStats } from '@/components/admin/dashboard-stats'

type Tab = 'dashboard' | 'products' | 'categories' | 'banners' | 'orders'

const TABS = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products' as Tab, label: 'Prodotti', icon: Package },
  { id: 'categories' as Tab, label: 'Categorie', icon: Tag },
  { id: 'banners' as Tab, label: 'Banner', icon: Image },
  { id: 'orders' as Tab, label: 'Ordini', icon: ShoppingBag },
]

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [checking, setChecking] = useState(true)

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

  if (checking) return <div className="min-h-screen flex items-center justify-center text-stone-400">Caricamento...</div>

  if (!authenticated) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-stone-800 text-center mb-6">Accesso Admin</h1>
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
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-stone-800">MG<span className="text-amber-600">Shop</span> Admin</span>
        <div className="flex items-center gap-3">
          <Link href="/mgadmin-panel/migra-immagini" className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 font-medium">
            <ArrowRightLeft className="w-4 h-4" /> Migra immagini
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-stone-200 px-4 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardStats />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'orders' && <OrdersManager />}
      </div>
    </div>
  )
}
