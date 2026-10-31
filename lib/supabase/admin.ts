import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role key: se salta RLS. Solo para tareas sin sesión de usuario (el cron
 * de recordatorios); todo lo demás usa el cliente de servidor con la sesión y RLS.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
