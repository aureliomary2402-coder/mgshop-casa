const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(phoneNumber: string): Promise
  { ok: true } | { ok: false; reason: string }
> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not-supported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, phoneNumber }),
    });

    if (!res.ok) return { ok: false, reason: 'save-failed' };
    return { ok: true };
  } catch (err) {
    console.error('Errore subscribe push:', err);
    return { ok: false, reason: 'exception' };
  }
}
