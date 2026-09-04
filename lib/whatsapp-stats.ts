// lib/whatsapp-stats.ts
// Legge il numero di follower del canale WhatsApp dalla pagina pubblica
// del canale (la stessa che si apre cliccando il link, senza login).
// Nessuna API ufficiale: leggiamo il testo già presente nell'HTML pubblico.
//
// Variabile d'ambiente richiesta:
//   WHATSAPP_CHANNEL_URL  -> es. https://www.whatsapp.com/channel/0029VbChkIv9Bb66CYyUH02u

export type WhatsAppChannelStats = {
  followerCount: number;
  followerCountLabel: string;
  channelName?: string;
};

function parseFollowerLabel(raw: string): number {
  const cleaned = raw.trim().replace(",", ".");
  const match = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2].toLowerCase();
  if (suffix === "k") return Math.round(num * 1_000);
  if (suffix === "m") return Math.round(num * 1_000_000);
  return Math.round(num);
}

export async function getWhatsAppChannelStats(): Promise<WhatsAppChannelStats> {
  const url = process.env.WHATSAPP_CHANNEL_URL;
  if (!url) {
    throw new Error("Manca WHATSAPP_CHANNEL_URL nelle variabili d'ambiente");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Accept-Language": "it-IT,it;q=0.9",
    },
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`Pagina canale WhatsApp non raggiungibile (status ${res.status})`);
  }

  const html = await res.text();

  const followerMatch = html.match(/([\d.,]+\s?[KkMm]?)\s*follower/i);
  if (!followerMatch) {
    throw new Error("Numero di follower non trovato nella pagina del canale");
  }

  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);

  return {
    followerCount: parseFollowerLabel(followerMatch[1]),
    followerCountLabel: followerMatch[1].trim(),
    channelName: titleMatch ? titleMatch[1] : undefined,
  };
}
