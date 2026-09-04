// lib/facebook-stats.ts
// Legge l'ultima riga salvata nella tabella "facebook_page_stats" di Supabase.
// Quella tabella viene aggiornata ogni giorno alle 6:00 da una edge function
// (sync-facebook-stats) che chiama la Graph API di Facebook e salva i dati.

import { SupabaseClient } from "@supabase/supabase-js";

export type FacebookStats = {
  fanCount: number;
  recordedAt: string;
};

export async function getFacebookStats(
  supabase: SupabaseClient
): Promise<FacebookStats> {
  const { data, error } = await supabase
    .from("facebook_page_stats")
    .select("fan_count, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Errore lettura statistiche Facebook: ${error.message}`);
  }

  if (!data) {
    throw new Error("Nessuna statistica Facebook ancora salvata");
  }

  return {
    fanCount: data.fan_count ?? 0,
    recordedAt: data.recorded_at,
  };
}
