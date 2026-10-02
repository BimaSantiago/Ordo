import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/date";
import { toCsv } from "@/lib/export/csv";
import { EXPORT_TABLES, isExportTable } from "@/lib/export/tables";

// Respaldo de todos los datos del usuario (sección 7 de CLAUDE.md). RLS garantiza que cada
// consulta solo regrese filas propias; la sesión la valida el proxy (incluida la verificación
// en dos pasos).

const PAGE_SIZE = 1000; // límite por respuesta de PostgREST

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("No autenticado", { status: 401 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const date = getLocalDateString();

  async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
      // La biblioteca global de ejercicios no es del usuario: solo sus ejercicios personalizados.
      if (table === "exercises") query = query.eq("user_id", auth.user!.id);
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) return rows;
    }
  }

  try {
    if (format === "csv") {
      const table = request.nextUrl.searchParams.get("table") ?? "";
      if (!isExportTable(table)) return new Response("Tabla inválida", { status: 400 });
      return new Response(toCsv(await fetchAll(table)), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="life-os-${table}-${date}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const { table } of EXPORT_TABLES) tables[table] = await fetchAll(table);
    const body = JSON.stringify({ app: "Life OS", exportedAt: new Date().toISOString(), version: 1, tables }, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="life-os-respaldo-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(`No se pudo exportar: ${(error as Error).message}`, { status: 500 });
  }
}
