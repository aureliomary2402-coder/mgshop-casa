// lib/tiktok-stats.ts
// Richiede le variabili d'ambiente:
//   TIKTOK_ACCESS_TOKEN  -> ottenuto facendo login con TikTok dal gestionale
//   TIKTOK_OPEN_ID       -> mostrato insieme al token dopo il login
//
// N.B. Il token di TikTok in Sandbox ha vita breve: se scade, basta rifare
// il login dal pulsante "Accedi con TikTok" nel gestionale.

export type TikTokStats = {
  followerCount: number;
  followingCount: number;
  videoCount: number;
  likesCount: number;
};

export async function getTikTokStats(): Promise<TikTokStats> {
  const { TIKTOK_ACCESS_TOKEN } = process.env;

  if (!TIKTOK_ACCESS_TOKEN) {
    throw new Error("Manca TIKTOK_ACCESS_TOKEN — fai login con TikTok dal gestionale");
  }

  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count,likes_count",
    {
      headers: { Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}` },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);

  const json = await res.json();
  if (json.error && json.error.code !== "ok") {
    throw new Error(json.error.message || "Errore TikTok API");
  }

  const user = json.data?.user ?? {};
  return {
    followerCount: user.follower_count ?? 0,
    followingCount: user.following_count ?? 0,
    videoCount: user.video_count ?? 0,
    likesCount: user.likes_count ?? 0,
  };
}
