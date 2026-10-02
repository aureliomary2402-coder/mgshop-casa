import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLatestDeploys } from "@/lib/vercel";
import { getRecentCommits, getOpenIssues } from "@/lib/github";
import { getShopStats } from "@/lib/supabase-stats";
import { getInstagramStats } from "@/lib/instagram-stats";
import { getTikTokStats } from "@/lib/tiktok-stats";
import { getWhatsAppChannelStats } from "@/lib/whatsapp-stats";
import { getFacebookStats } from "@/lib/facebook-stats";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (session !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = await Promise.allSettled([
    getLatestDeploys(5),
    getRecentCommits(5),
    getOpenIssues(5),
    getShopStats(supabaseAdmin),
    getInstagramStats(),
    getTikTokStats(),
    getWhatsAppChannelStats(),
    getFacebookStats(supabaseAdmin),
  ]);

  const [deploys, commits, issues, shopStats, instagram, tiktok, whatsapp, facebook] = results;

  return NextResponse.json({
    deploys: deploys.status === "fulfilled" ? deploys.value : { error: deploys.reason?.message },
    commits: commits.status === "fulfilled" ? commits.value : { error: commits.reason?.message },
    issues: issues.status === "fulfilled" ? issues.value : { error: issues.reason?.message },
    shopStats: shopStats.status === "fulfilled" ? shopStats.value : { error: shopStats.reason?.message },
    instagram: instagram.status === "fulfilled" ? instagram.value : { error: instagram.reason?.message },
    tiktok: tiktok.status === "fulfilled" ? tiktok.value : { error: tiktok.reason?.message },
    whatsapp: whatsapp.status === "fulfilled" ? whatsapp.value : { error: whatsapp.reason?.message },
    facebook: facebook.status === "fulfilled" ? facebook.value : { error: facebook.reason?.message },
  });
}
