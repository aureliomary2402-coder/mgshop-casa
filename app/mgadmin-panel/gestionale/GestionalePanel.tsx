"use client";

import { useEffect, useState } from "react";
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

export function GestionalePanel() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/gestionale/status", { cache: "no-store" });
      const json = await res.json();
      if (active) {
        setData(json);
        setLastSync(new Date());
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const lastDeploy = data?.deploys?.[0];

  return (
    <div className="rounded-xl bg-[#0B0D10] px-6 py-8 font-sans">
      <div className="mx-auto max-w-6xl flex flex-col gap-8">
        <header className="flex items-end justify-between border-b border-[#232830] pb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#838C99] font-mono mb-1">
              mgshop / centro di controllo
            </p>
            <h1 className="text-2xl font-bold text-[#EDEFF2] tracking-tight">
              Gestionale
            </h1>
          </div>
          <p className="text-xs text-[#5B6270] font-mono">
            {lastSync ? `sync ${lastSync.toLocaleTimeString("it-IT")}` : "sincronizzazione…"}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Panel
            title="Deploy"
            eyebrow="Vercel"
            status={
              !data ? "offline" : lastDeploy?.state === "READY" ? "live" :
              lastDeploy?.state === "ERROR" ? "error" : "warning"
            }
          >
            {!data && <p className="text-[#5B6270]">Caricamento…</p>}
            {data?.deploys?.error && (
              <p className="text-[#F0554D]">{data.deploys.error}</p>
            )}
            {Array.isArray(data?.deploys) && data.deploys.slice(0, 3).map((d: any) => (
              <div key={d.id} className="flex justify-between py-1 border-b border-[#1D2129] last:border-0">
                <span className="truncate">{d.commitMessage ?? d.branch ?? "deploy"}</span>
                <span className="font-mono text-xs text-[#838C99]">{d.state}</span>
              </div>
            ))}
          </Panel>

          <Panel
            title="Repository"
            eyebrow="GitHub"
            status={!data ? "offline" : data?.commits?.error ? "error" : "live"}
          >
            {!data && <p className="text-[#5B6270]">Caricamento…</p>}
            {data?.commits?.error && <p className="text-[#F0554D]">{data.commits.error}</p>}
            {Array.isArray(data?.commits) && data.commits.slice(0, 3).map((c: any) => (
              <div key={c.sha} className="flex justify-between py-1 border-b border-[#1D2129] last:border-0">
                <span className="truncate">{c.message}</span>
                <span className="font-mono text-xs text-[#838C99]">{c.sha}</span>
              </div>
            ))}
          </Panel>

          <Panel
            title="Negozio"
            eyebrow="Supabase"
            status={!data ? "offline" : data?.shopStats?.error ? "error" : "live"}
          >
            {!data && <p className="text-[#5B6270]">Caricamento…</p>}
            {data?.shopStats?.error && <p className="text-[#F0554D]">{data.shopStats.error}</p>}
            {data?.shopStats && !data.shopStats.error && (
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Ordini oggi" value={data.shopStats.ordersToday} />
                <Stat label="In attesa" value={data.shopStats.pendingOrders} />
                <Stat label="Prodotti" value={data.shopStats.totalProducts} />
                <Stat label="Scorte basse" value={data.shopStats.lowStockProducts} />
              </div>
            )}
          </Panel>
          <Panel
            title="Instagram"
            eyebrow="@mgshopcasa"
            status={!data ? "offline" : data?.instagram?.error ? "error" : "live"}
          >
            {!data && <p className="text-[#5B6270]">Caricamento…</p>}
            {data?.instagram?.error && <p className="text-[#F0554D]">{data.instagram.error}</p>}
            {data?.instagram && !data.instagram.error && (
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Follower" value={data.instagram.followersCount} />
                <Stat label="Post totali" value={data.instagram.mediaCount} />
                <Stat label="Mi piace (ultimi 10)" value={data.instagram.recentLikes} />
                <Stat label="Commenti (ultimi 10)" value={data.instagram.recentComments} />
              </div>
            )}
          </Panel>
        </div>

        <section className="rounded-lg border border-[#232830] bg-[#14171C] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#838C99] font-mono mb-1">
            Social
          </p>
          <h2 className="text-[15px] font-semibold text-[#EDEFF2] mb-4">
            TikTok
          </h2>
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
        </section>

        <section className="rounded-lg border border-[#232830] bg-[#14171C] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#838C99] font-mono mb-1">
            Social
          </p>
          <h2 className="text-[15px] font-semibold text-[#EDEFF2] mb-4">
            Canale WhatsApp
          </h2>
          {data?.whatsapp?.error && (
            <p className="text-xs text-[#F0554D]">{data.whatsapp.error}</p>
          )}
          {data?.whatsapp && !data.whatsapp.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Follower" value={data.whatsapp.followerCount} />
              <div>
                <p className="text-lg font-mono font-semibold text-[#EDEFF2]">
                  {data.whatsapp.channelName ?? "—"}
                </p>
                <p className="text-[11px] text-[#5B6270]">Nome canale</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#232830] bg-[#14171C] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#838C99] font-mono mb-1">
            Social
          </p>
          <h2 className="text-[15px] font-semibold text-[#EDEFF2] mb-4">
            Facebook
          </h2>
          {data?.facebook?.error && (
            <p className="text-xs text-[#F0554D]">{data.facebook.error}</p>
          )}
          {data?.facebook && !data.facebook.error && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Mi piace pagina" value={data.facebook.fanCount} />
              <div>
                <p className="text-lg font-mono font-semibold text-[#EDEFF2]">
                  {data.facebook.recordedAt
                    ? new Date(data.facebook.recordedAt).toLocaleString("it-IT")
                    : "—"}
                </p>
                <p className="text-[11px] text-[#5B6270]">Ultimo aggiornamento</p>
              </div>
            </div>
          )}
        </section>
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
