import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { QuickAddProvider } from "@/components/quick-add/quick-add-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SyncProvider } from "@/components/offline/sync-provider";
import { ConnectionStatus } from "@/components/offline/connection-status";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Igual al fondo de la parte superior de la app en cada esquema (barra de estado sin corte).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1214" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ServiceWorkerRegistration />
        <SyncProvider>
          <QuickAddProvider>
            <ConnectionStatus />
            {children}
            <BottomNav />
          </QuickAddProvider>
        </SyncProvider>
      </body>
    </html>
  );
}
