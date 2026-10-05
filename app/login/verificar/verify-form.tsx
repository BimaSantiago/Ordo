"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Segundo paso del inicio de sesión: código de 6 dígitos de la app autenticadora. */
export function VerifyForm() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (listError) return setError(listError.message);
      const totp = data.totp.find((factor) => factor.status === "verified");
      if (!totp) return setError("No encontramos tu verificación en dos pasos. Cierra sesión y vuelve a entrar.");
      setFactorId(totp.id);
    });
  }, []);

  async function verify(value: string) {
    if (!factorId || value.length !== 6) return;
    setIsVerifying(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
    if (verifyError) {
      setIsVerifying(false);
      setCode("");
      return setError("Código incorrecto o vencido. Usa el código actual de tu app.");
    }
    // Recarga completa: el proxy ya ve la sesión con nivel aal2.
    window.location.replace("/hoy");
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    window.location.replace("/login");
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck size={28} aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Verificación en dos pasos</h1>
        <p className="text-sm text-muted">Escribe el código de 6 dígitos de tu app autenticadora.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="space-y-4"
      >
        <input
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            // Al completar los 6 dígitos se verifica solo (un toque menos).
            if (digits.length === 6) void verify(digits);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          aria-label="Código de verificación"
          disabled={!factorId || isVerifying}
          className="min-h-14 w-full rounded-xl border border-line bg-surface text-center text-2xl font-bold tracking-[0.4em] tabular-nums outline-none focus:border-primary"
        />
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={!factorId || code.length !== 6 || isVerifying} className="min-h-12">
          {isVerifying ? "Verificando…" : "Verificar"}
        </Button>
      </form>

      <button type="button" onClick={signOut} className="pressable mx-auto block min-h-11 text-sm font-semibold text-muted">
        Usar otra cuenta
      </button>
    </div>
  );
}
