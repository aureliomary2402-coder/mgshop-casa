"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Panel } from "./components/Panel";

type StatusResponse = {
  deploys: any;
  commits: any;
  issues: any;
  shopStats: any;
};

const SOCIAL_CHANNELS = [
  { name: "Facebook", note: "Richiede Meta Graph API + app review" },
  { name: "TikTok", note: "Richiede TikTok Content Posting API" },
  { name: "WhatsApp", note: "Richiede WhatsApp Business Platform" },
];

export default function GestionaleMgshop() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => {
        if (r.ok) setAuthenticated(true);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setAuthenticated(true);
    else setError("Password errata");
    setLoading(false);
  };

  useEffect(() => {
    if (!authenticated) return;
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
  }, [authenticated]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0D10] text-[#5B6270]">
        Caricamento…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0D10] px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg border border-[#232830] bg-[#14171C] p-6 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-[#EDEFF2]">
            <Lock className="w-5 h-5" />
            <h1 className="text-base font-semibold">Gestionale mgshop</h1>
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="rounded-md border border-[#232830] bg-[#0B0D10] px-3 py-2 text-sm text-[#EDEFF2] outline-none focus:border-[#6E7BFF]"
          />
          {error && <p className="text-xs text-[#F0554D]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#6E7BFF] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Accesso…" : "Accedi"}
          </button>
        </form>
      </div>
    );
  }

  const lastDeploy = data?.deploys?.[0];

  return (
    <div className="min-h-screen bg-[#0B0D10] px-6 py-10 font-sans">
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
            Altri canali
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOCIAL_CHANNELS.map((ch) => (
              <div
                key={ch.name}
                className="rounded-md border border-dashed border-[#2B313C] p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#EDEFF2]">{ch.name}</span>
                  <span className="h-2 w-2 rounded-full bg-[#4B5563]" />
                </div>
                <p className="text-xs text-[#5B6270]">{ch.note}</p>
                <button
                  disabled
                  className="mt-1 text-xs font-mono text-[#6E7BFF] border border-[#2B313C] rounded px-2 py-1 opacity-50 cursor-not-allowed"
                >
                  Connetti API →
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#5B6270] mt-4">
            Questa sezione è pronta a livello di interfaccia. Per attivarla su ogni
            canale serve registrare un&apos;app sviluppatore con quella piattaforma
            e ottenere i token — vedi il README per i link diretti.
          </p>
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
