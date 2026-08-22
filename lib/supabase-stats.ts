// lib/supabase-stats.ts
// Usa il client Supabase già presente nel tuo progetto (service role key,
// SOLO lato server — mai esporlo al client).
//
//   import { createClient } from "@supabase/supabase-js";
//   const supabaseAdmin = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!
//   );
//
// Adatta i nomi delle tabelle ("orders", "products") a quelli reali del tuo schema.

import { SupabaseClient } from "@supabase/supabase-js";

export type ShopStats = {
  ordersToday: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
};

export async function getShopStats(supabase: SupabaseClient): Promise<ShopStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [ordersToday, pendingOrders, totalProducts, lowStock] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).lt("stock", 5),
  ]);

  return {
    ordersToday: ordersToday.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
    totalProducts: totalProducts.count ?? 0,
    lowStockProducts: lowStock.count ?? 0,
  };
}
