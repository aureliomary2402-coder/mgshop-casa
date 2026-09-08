const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

import { getSessionId } from './session-id'
import { getDeviceId } from './device-id'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

type SubscribeResult = { ok: true } | { ok: false; reason: string }

export async function subscribeToPush(phoneNumber?: string): Promise<SubscribeResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not-supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' }
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // sessionId collega questa iscrizione alla sessione del browser (per
      // i carrelli abbandonati); deviceId è invece stabile nel tempo e
      // serve per i preferiti, che restano salvati anche a distanza di giorni.
      body: JSON.stringify({ subscription, phoneNumber, sessionId: getSessionId(), deviceId: getDeviceId() }),
    })

    if (!res.ok) return { ok: false, reason: 'save-failed' }
    return { ok: true }
  } catch (err) {
    console.error('Errore subscribe push:', err)
    return { ok: false, reason: 'exception' }
  }
}

// Ricollega silenziosamente (senza chiedere alcun permesso, quindi senza
// popup) l'iscrizione notifiche già esistente su questo dispositivo alla
// sessione corrente. Serve per i clienti che avevano già attivato le
// notifiche PRIMA di questa funzione: senza questo richiamo automatico,
// la loro iscrizione resterebbe "orfana" (senza session_id) e non potrebbe
// mai essere collegata a un carrello abbandonato. Va chiamata a ogni
// apertura del sito, solo se il permesso risulta già concesso.
export async function syncPushSession(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    // Nota: niente phoneNumber qui, di proposito — così un numero già
    // salvato in precedenza per questa iscrizione non viene cancellato.
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, sessionId: getSessionId(), deviceId: getDeviceId() }),
    })
  } catch (err) {
    console.error('Errore sync sessione push:', err)
  }
}

// Disattiva le notifiche: annulla la subscription lato browser e rimuove
// la riga corrispondente da push_subscriptions lato server. Usata dallo
// switch OFF nel popup "Il mio account" e riusabile ovunque serva.
export async function unsubscribeFromPush(): Promise<SubscribeResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not-supported' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return { ok: true }

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    const res = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })

    if (!res.ok) return { ok: false, reason: 'delete-failed' }
    return { ok: true }
  } catch (err) {
    console.error('Errore unsubscribe push:', err)
    return { ok: false, reason: 'exception' }
  }
}
