export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-slate-500">
        No hay señal en este momento. Lo que registres localmente se sincronizará
        cuando vuelvas a tener conexión.
      </p>
    </main>
  );
}
