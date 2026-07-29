cd ~/mgshop-casa
cat > components/admin/pending-fulfillment.tsx << 'EOF'
"use client"

import { useState, useEffect, useMemo } from 'react'
import { Truck, Euro, Phone, CheckCircle2, PackageCheck, Hash, Clock, Pencil, Check, X, Package } from 'lucide-react'

interface PendingItem {
  id: string
  phone_number: string
  customer_name: string | null
  total: number
  status: string
  created_at: string
  is_ticket_only: boolean
  items: { name: string; quantity: number }[]
  lottery_numbers: number[]
}

interface CustomerGroup {
  normalized: string
  phone_number: string
  customer_name: string | null
  orders: PendingItem[]
  total: number
  oldestCreatedAt: string
}

// Stessa identica logica di normalizzazione usata in clienti-manager / orders /
// loyalty / chat, così un cliente viene riconosciuto come lo stesso anche se il
// numero è stato scritto con prefisso, spazi o formati diversi.
function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

// Quanti giorni sono passati dalla data dell'ordine: serve sia per
// l'etichetta ("3 giorni fa") sia per decidere il colore di urgenza.
function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}
function daysAgoLabel(days: number) {
  if (days <= 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days} giorni fa`
}

// Più tempo passa senza consegnare/incassare, più il colore vira verso il
// rosso: un colpo d'occhio dice subito quali sono più urgenti, senza dover
// leggere ogni riga.
function urgency(days: number) {
  if (days >= 5) return { bar: '#ef4444', chip: 'bg-red-50 text-red-600' }
  if (days >= 2) return { bar: '#f59e0b', chip: 'bg-amber-50 text-amber-700' }
  return { bar: '#0891b2', chip: 'bg-cyan-50 text-cyan-700' }
}

export function PendingFulfillment() {
  const [items, setItems] = useState<PendingItem[] | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const load = () => {
    fetch('/api/admin/pending-fulfillment').then(r => r.json()).then(d => setItems(d.pending || [])).catch(() => setItems([]))
  }

  useEffect(() => { load() }, [])

  const totalDue = useMemo(() => (items || []).reduce((s, i) => s + Number(i.total), 0), [items])

  // Raggruppa gli ordini per cliente in base al numero di telefono
  // normalizzato: chi ha più ordini (prodotti e/o biglietti) da ritirare
  // vede una sola scheda con tutto dentro, invece di una scheda per ordine.
  // Gli item arrivano già ordinati dal più vecchio al più recente, quindi il
  // primo ordine incontrato per ogni cliente resta quello che determina
  // l'urgenza del gruppo.
  const groups = useMemo(() => {
    const map = new Map<string, CustomerGroup>()
    for (const item of items || []) {
      const normalized = normalizePhone(item.phone_number)
      let group = map.get(normalized)
      if (!group) {
        group = {
          normalized,
          phone_number: item.phone_number,
          customer_name: item.customer_name,
          orders: [],
          total: 0,
          oldestCreatedAt: item.created_at,
        }
        map.set(normalized, group)
      }
      group.orders.push(item)
      group.total += Number(item.total)
      if (!group.customer_name && item.customer_name) group.customer_name 
