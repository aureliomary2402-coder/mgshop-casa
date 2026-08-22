import { NextResponse } from "next/server";
import { getLatestDeploys } from "@/lib/vercel";
import { getRecentCommits, getOpenIssues } from "@/lib/github";
import { getShopStats } from "@/lib/supabase-stats";
import { createClient } from "@supabase/supabase-js";

// Middleware/auth: proteggi questa route così solo tu (admin) puoi chiamarla.
// Esempio rapido con un cookie di sessione admin già presente nel tuo sito:
//   if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET() {
  const results = await Promise.allSettled([
    getLatestDeploys(5),
    getRecentCommits(5),
    getOpenIssues(5),
    (async () => {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      return getShopStats(supabaseAdmin);
    })(),
  ]);

  const [deploys, commits, issues, shopStats] = results;

  return NextResponse.json({
    deploys: deploys.status === "fulfilled" ? deploys.value : { error: deploys.reason?.message },
    commits: commits.status === "fulfilled" ? commits.value : { error: commits.reason?.message },
    issues: issues.status === "fulfilled" ? issues.value : { error: issues.reason?.message },
    shopStats: shopStats.status === "fulfilled" ? shopStats.value : { error: shopStats.reason?.message },
  });
}
