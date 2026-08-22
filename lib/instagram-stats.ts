// lib/instagram-stats.ts
// Usa le variabili già presenti in .env.local:
//   INSTAGRAM_ACCESS_TOKEN
//   INSTAGRAM_ACCOUNT_ID
//
// N.B. Il token generato dal pannello Meta scade dopo circa 60 giorni:
// quando smette di funzionare, se ne genera uno nuovo da
// developers.facebook.com > la tua app > Casi d'uso > Configurazione
// dell'API con Instagram > "Genera token".

export type InstagramStats = {
  username: string;
  followersCount: number;
  mediaCount: number;
  recentLikes: number;
  recentComments: number;
};

export async function getInstagramStats(): Promise<InstagramStats> {
  const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID } = process.env;

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    throw new Error("Manca INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_ACCOUNT_ID");
  }

  // Dati base account: nome utente, numero follower, numero post totali
  const profileRes = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_ACCOUNT_ID}?fields=username,followers_count,media_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`,
    { next: { revalidate: 300 } } // aggiorna ogni 5 minuti, non serve più spesso
  );
  if (!profileRes.ok) throw new Error(`Instagram API error: ${profileRes.status}`);
  const profile = await profileRes.json();

  // Mi piace/commenti sugli ultimi 10 post, sommati
  const mediaRes = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_ACCOUNT_ID}/media?fields=like_count,comments_count&limit=10&access_token=${INSTAGRAM_ACCESS_TOKEN}`,
    { next: { revalidate: 300 } }
  );
  const mediaData = mediaRes.ok ? await mediaRes.json() : { data: [] };

  const recentLikes = (mediaData.data ?? []).reduce(
    (sum: number, post: any) => sum + (post.like_count ?? 0),
    0
  );
  const recentComments = (mediaData.data ?? []).reduce(
    (sum: number, post: any) => sum + (post.comments_count ?? 0),
    0
  );

  return {
    username: profile.username,
    followersCount: profile.followers_count ?? 0,
    mediaCount: profile.media_count ?? 0,
    recentLikes,
    recentComments,
  };
}
