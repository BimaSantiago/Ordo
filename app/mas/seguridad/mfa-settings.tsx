"use client";

/* eslint-disable @next/next/no-img-element -- el QR llega como data URL SVG de Supabase; next/image no aporta nada aquí. */
import { useCallback, useEffect, useState } from "react";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string };
type Status = { kind: "loading" } | { kind: "off" } | { kind: "on"; factorId: string } | { kind: "enrolling"; enrollment: Enrollment };

export function MfaSettings() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return setError(listError.message);
    const verified = data.totp.find((f) => f.status === "verified");
    setStatus(verified ? { kind: "on", factorId: verified.id } : { kind: "off" });
  }, []);

  useEffect(() => {
    // Primera carga fuera del render (la sesión vive en el navegador).
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    // Factores sin verificar de intentos anteriores: se quitan para no acumularlos.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Life OS ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (enrollError) return setError(enrollError.message);
    setCode("");
    setStatus({ kind: "enrolling", enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } });
  }

  async function confirmEnrollment(enrollment: Enrollment) {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    setBusy(false);
    if (verifyError) {
      setCode("");
      return setError("Código incorrecto. Revisa que la hora del teléfono esté bien y usa el código actual.");
    }
    setStatus({ kind: "on", factorId: enrollment.factorId });
  }

  async function disable(factorId: string) {
    if (!confirmOff) return setConfirmOff(true);
    setBusy(true);
    setError(null);
    const { error: unenrollError } = await createSupabaseBrowserClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    setConfirmOff(false);
    if (unenrollError) return setError(unenrollError.message);
    await refresh();
  }

  return (
    <div className="space-y-4">
      {status.kind === "loading" && <Card className="h-32 animate-pulse" />}

      {status.kind === "off" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <ShieldOff size={24} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-semibold">Desactivada</p>
              <p className="text-sm text-muted">
                Además de tu contraseña se pedirá un código de 6 dígitos de una app como Google Authenticator, Microsoft
                Authenticator o Authy. Así, si alguien obtiene tu contraseña, no puede ver tus datos.
              </p>
            </div>
          </div>
          <Button block onClick={startEnrollment} disabled={busy}>
            Activar verificación en dos pasos
          </Button>
        </Card>
      )}

      {status.kind === "enrolling" && (
        <Card className="space-y-4 p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Abre tu app autenticadora y agrega una cuenta nueva.</li>
            <li>Escanea este código QR (o escribe la clave de abajo).</li>
            <li>Escribe el código de 6 dígitos que te muestre la app.</li>
          </ol>
          <img
            src={status.enrollment.qrCode}
            alt="Código QR para la app autenticadora"
            width={192}
            height={192}
            className="mx-auto rounded-xl bg-white p-2"
          />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(status.enrollment.secret).then(() => setCopied(true));
            }}
            className="pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 font-mono text-sm break-all"
            aria-label="Copiar clave secreta"
          >
            <span>{status.enrollment.secret}</span>
            <Copy size={16} className="shrink-0" aria-hidden />
          </button>
          {copied && <p className="text-center text-xs text-muted">Clave copiada</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmEnrollment(status.enrollment);
            }}
            className="flex gap-2"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-label="Código de 6 dígitos"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface text-center text-xl font-bold tracking-[0.3em] tabular-nums outline-none focus:border-primary"
            />
            <Button type="submit" disabled={busy || code.length !== 6}>
              Confirmar
            </Button>
          </form>
          <Button variant="ghost" block onClick={() => void refresh()} disabled={busy}>
            Cancelar
          </Button>
        </Card>
      )}

      {status.kind === "on" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={24} className="mt-0.5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-semibold">Activada</p>
              <p className="text-sm text-muted">
                Al iniciar sesión en un dispositivo se pedirá el código de tu app autenticadora. Si pierdes el teléfono,
                puedes quitar el factor desde el panel de Supabase (Authentication → Users → tu usuario).
              </p>
            </div>
          </div>
          <Button variant="danger" block onClick={() => void disable(status.factorId)} disabled={busy}>
            {confirmOff ? "¿Seguro? Toca de nuevo para desactivar" : "Desactivar"}
          </Button>
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
