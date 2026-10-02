import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { QuickAddProvider } from "@/components/quick-add/quick-add-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SyncProvider } from "@/components/offline/sync-provider";
import { ConnectionStatus } from "@/components/offline/connection-status";
import { SettingsProvider } from "@/components/settings-provider";
import { getSettings } from "@/lib/settings-server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "Panel personal para hábitos, tareas, gimnasio, finanzas y notas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life OS",
  },
};

const LIGHT_CANVAS = "#f4f8f8";
const DARK_CANVAS = "#0b1214";

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getSettings();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    // Igual al fondo de la parte superior de la app (barra de estado sin corte), según el tema elegido.
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: LIGHT_CANVAS },
            { media: "(prefers-color-scheme: dark)", color: DARK_CANVAS },
          ]
        : theme === "dark"
          ? DARK_CANVAS
          : LIGHT_CANVAS,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <html
      lang="es-MX"
      // Tema forzado desde el servidor: sin parpadeo al cargar (con "system" decide el CSS).
      data-theme={settings.theme === "system" ? undefined : settings.theme}
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ServiceWorkerRegistration />
        <SettingsProvider settings={settings}>
          <SyncProvider>
            <QuickAddProvider>
              <ConnectionStatus />
              {children}
              <BottomNav />
            </QuickAddProvider>
          </SyncProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
