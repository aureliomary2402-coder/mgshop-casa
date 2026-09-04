// lib/vercel.ts
// Richiede le variabili d'ambiente:
//   VERCEL_TOKEN       -> Account Settings > Tokens su vercel.com
//   VERCEL_PROJECT_ID  -> Project Settings > General
//   VERCEL_TEAM_ID     -> (opzionale, solo se il progetto è sotto un team)

export type DeploySummary = {
  id: string;
  state: "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED";
  url: string;
  createdAt: string;
  commitMessage?: string;
  branch?: string;
};

export async function getLatestDeploys(limit = 5): Promise<DeploySummary[]> {
  const { VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID } = process.env;

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error("Manca VERCEL_TOKEN o VERCEL_PROJECT_ID nelle variabili d'ambiente");
  }

  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    limit: String(limit),
  });
  if (VERCEL_TEAM_ID) params.set("teamId", VERCEL_TEAM_ID);

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    // Aggiorna lo stato ogni 30s invece di richiamare ad ogni render
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Vercel API error: ${res.status}`);
  }

  const data = await res.json();

  return (data.deployments ?? []).map((d: any) => ({
    id: d.uid,
    state: d.state,
    url: d.url,
    createdAt: new Date(d.created).toISOString(),
    commitMessage: d.meta?.githubCommitMessage,
    branch: d.meta?.githubCommitRef,
  }));
}
