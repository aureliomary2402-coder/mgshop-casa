import { NextRequest, NextResponse } from "next/server";

// Dopo che l'utente fa login su TikTok, TikTok reindirizza qui con un "code".
// Questa route lo scambia con un vero access token, usando client key/secret.
//
// Variabili d'ambiente richieste:
//   TIKTOK_CLIENT_KEY
//   TIKTOK_CLIENT_SECRET
//
// Il token NON viene salvato automaticamente da nessuna parte: viene solo
// mostrato una volta a schermo, da copiare a mano in .env.local (stesso
// procedimento fatto per Instagram/Vercel/GitHub). Non è "user friendly"
// al 100%, ma evita di dover costruire uno storage sicuro per i token.

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(`Login TikTok annullato o fallito: ${error}`, { status: 400 });
  }
  if (!code) {
    return new NextResponse("Manca il parametro 'code' nella risposta di TikTok", { status: 400 });
  }

  const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } = process.env;
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    return new NextResponse("Mancano TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET nelle variabili d'ambiente", { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/tiktok/callback`;

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok || data.error) {
    return new NextResponse(
      `Errore nello scambio del token: ${JSON.stringify(data)}`,
      { status: 500 }
    );
  }

  // Mostriamo il token una sola volta, in una pagina semplice da copiare.
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="it">
    <head><meta charset="UTF-8"><title>Token TikTok</title></head>
    <body style="font-family: sans-serif; background:#0B0D10; color:#EDEFF2; padding:2rem;">
      <h1>Login TikTok riuscito</h1>
      <p>Copia questi due valori in <code>.env.local</code> e su Vercel, poi torna al gestionale.</p>
      <p><strong>TIKTOK_ACCESS_TOKEN</strong></p>
      <textarea style="width:100%;height:80px;">${data.access_token}</textarea>
      <p><strong>TIKTOK_OPEN_ID</strong></p>
      <textarea style="width:100%;height:40px;">${data.open_id}</textarea>
      <p style="color:#F0554D;">Non condividere questa pagina con nessuno: contiene un token di accesso.</p>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
