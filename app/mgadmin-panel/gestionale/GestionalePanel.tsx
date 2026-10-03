"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Panel } from "./components/Panel";

type StatusResponse = {
  deploys: any;
  commits: any;
  issues: any;
  shopStats: any;
  instagram: any;
  tiktok: any;
  whatsapp: any;
  facebook: any;
};

type Card = { id: string; connected: boolean; node: ReactNode };

export function GestionalePanel() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/gestionale/status", { cache: "no-store" });
      const json = await res.json();
      setData(json);
      setLastSync(new Date());
    } catch {
      // se la richiesta fallisce teniamo i dati precedenti
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const lastDeploy = data?.deploys?.[0];
  const loadingText = <p className="text-[#5B6270]">Caricamento…</p>;

  // Un servizio è "collegato" se non restituisce errori.
  // Finché i dati non sono arrivati li mettiamo tutti in alto, senza saltelli.
  const ok = (x: any) => !data || !x?.error;

  const cards: Card[] = [
    {
      id: "deploy",
      connected: ok(data?.deploys),
      node: (
        <Panel
          title="Deploy"
          eyebrow="Vercel"
          status={
            !data ? "offline" : data.deploys?.error ? "offline" :
            lastDeploy?.state === "READY" ? "live" :
            lastDeploy?.state === "ERROR" ? "error" : "warning"
          }
        >
          {!data && loadingText}
          {data?.deploys?.error && <p className="text-[#838C99]">{data.deploys.error}</p>}
          {Array.isArray(data?.deploys) && data.deploys.slice(0, 3).map((d: any) => (
            <div key={d.id} className="flex justify-between gap-3 py-1 border-b border-[#1D2129] last:border-0">
              <span className="truncate">{d.commitMessage ?? d.branch ?? "deploy"}</span>
              <span className="font-mono text-xs text-[#838C99]">{d.state}</span>
            </div>
          ))}
        </Panel>
      ),
    },
    {
      id: "github",
      connected: ok(data?.commits),
      node: (
        <Panel
          title="Repository"
          eyebrow="GitHub"
          status={!data ? "offline" : data.commits?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.commits?.error && <p className="text-[#838C99]">{data.commits.error}</p>}
          {Array.isArray(data?.commits) && data.commits.slice(0, 3).map((c: any) => (
            <div key={c.sha} className="flex justify-between gap-3 py-1 border-b border-[#1D2129] last:border-0">
              <span className="truncate">{c.message}</span>
              <span className="font-mono text-xs text-[#838C99]">{c.sha}</span>
            </div>
          ))}
        </Panel>
      ),
    },
    {
      id: "supabase",
      connected: ok(data?.shopStats),
      node: (
        <Panel
          title="Negozio"
          eyebrow="Supabase"
          status={!data ? "offline" : data.shopStats?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.shopStats?.error && <p className="text-[#838C99]">{data.shopStats.error}</p>}
          {data?.shopStats && !data.shopStats.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Ordini oggi" value={data.shopStats.ordersToday} />
              <Stat label="In attesa" value={data.shopStats.pendingOrders} />
              <Stat label="Prodotti" value={data.shopStats.totalProducts} />
              <Stat label="Scorte basse" value={data.shopStats.lowStockProducts} />
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: "whatsapp",
      connected: ok(data?.whatsapp),
      node: (
        <Panel
          title="Canale WhatsApp"
          eyebrow="Social"
          status={!data ? "offline" : data.whatsapp?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.whatsapp?.error && <p className="text-[#838C99]">{data.whatsapp.error}</p>}
          {data?.whatsapp && !data.whatsapp.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Follower" value={data.whatsapp.followerCount} />
              <div>
                <p className="text-lg font-mono font-semibold text-[#EDEFF2] truncate">
                  {data.whatsapp.channelName ?? "—"}
                </p>
                <p className="text-[11px] text-[#5B6270]">Nome canale</p>
              </div>
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: "instagram",
      connected: ok(data?.instagram),
      node: (
        <Panel
          title="Instagram"
          eyebrow="@mgshopcasa"
          status={!data ? "offline" : data.instagram?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.instagram?.error && <p className="text-[#838C99]">{data.instagram.error}</p>}
          {data?.instagram && !data.instagram.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Follower" value={data.instagram.followersCount} />
              <Stat label="Post totali" value={data.instagram.mediaCount} />
              <Stat label="Mi piace (ultimi 10)" value={data.instagram.recentLikes} />
              <Stat label="Commenti (ultimi 10)" value={data.instagram.recentComments} />
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: "tiktok",
      connected: ok(data?.tiktok),
      node: (
        <Panel
          title="TikTok"
          eyebrow="Social"
          status={!data ? "offline" : data.tiktok?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.tiktok?.error && (
            <div className="rounded-md border border-dashed border-[#2B313C] p-4">
              <p className="text-xs text-[#5B6270] mb-3">
                Non ancora collegato. Fai login con l&apos;account TikTok di mgshop
                per vedere qui follower e statistiche.
              </p>
              <a
                href={`https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY}&scope=user.info.basic,user.info.profile,user.info.stats&response_type=code&redirect_uri=${typeof window !== "undefined" ? window.location.origin : ""}/api/tiktok/callback&state=gestionale`}
                className="inline-block text-xs font-mono text-[#6E7BFF] border border-[#2B313C] rounded px-3 py-1.5"
              >
                Accedi con TikTok →
              </a>
            </div>
          )}
          {data?.tiktok && !data.tiktok.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Follower" value={data.tiktok.followerCount} />
              <Stat label="Following" value={data.tiktok.followingCount} />
              <Stat label="Video totali" value={data.tiktok.videoCount} />
              <Stat label="Mi piace totali" value={data.tiktok.likesCount} />
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: "facebook",
      connected: ok(data?.facebook),
      node: (
        <Panel
          title="Facebook"
          eyebrow="Social"
          status={!data ? "offline" : data.facebook?.error ? "offline" : "live"}
        >
          {!data && loadingText}
          {data?.facebook?.error && <p className="text-[#838C99]">{data.facebook.error}</p>}
          {data?.facebook && !data.facebook.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Mi piace pagina" value={data.facebook.fanCount} />
              <div>
                <p className="text-sm font-mono font-semibold text-[#EDEFF2]">
                  {data.facebook.recordedAt
                    ? new Date(data.facebook.recordedAt).toLocaleString("it-IT")
                    : "—"}
                </p>
                <p className="text-[11px] text-[#5B6270]">Ultimo aggiornamento</p>
              </div>
            </div>
          )}
        </Panel>
      ),
    },
  ];

  const connectedCards = cards.filter((c) => c.connected);
  const disconnectedCards = cards.filter((c) => !c.connected);

  return (
    <div className="rounded-xl bg-[#0B0D10] px-6 py-8 font-sans">
      <div className="mx-auto max-w-6xl flex flex-col gap-8">
        <header className="flex items-end justify-between gap-3 border-b border-[#232830] pb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#838C99] font-mono mb-1">
              mgshop / centro di controllo
            </p>
            <h1 className="text-2xl font-bold text-[#EDEFF2] tracking-tight">
              Gestionale
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#5B6270] font-mono">
              {lastSync ? `sync ${lastSync.toLocaleTimeString("it-IT")}` : "sincronizzazione…"}
            </p>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              aria-label="Aggiorna dati"
              className="flex items-center gap-1.5 rounded-lg border border-[#232830] bg-[#12161B] px-3 py-1.5 text-xs font-medium text-[#EDEFF2] transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Aggiorno…" : "Aggiorna"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedCards.map((c) => (
            <div key={c.id}>{c.node}</div>
          ))}
        </div>

        {disconnectedCards.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="border-t border-[#232830] pt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#838C99] font-mono">
                Non collegati
              </p>
              <p className="text-xs text-[#5B6270] mt-1">
                Da collegare quando ti servono: per ora non mostrano dati.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
              {disconnectedCards.map((c) => (
                <div key={c.id}>{c.node}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-mono font-semibold text-[#EDEFF2]">{value}</p>
      <p className="text-[11px] text-[#5B6270]">{label}</p>
    </div>
  );
}
