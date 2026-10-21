import type { Metadata, Viewport } from "next";
import { GeistMono, GeistSans, InstrumentSerif } from "./fonts";
import "./globals.css";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Harmonie IT Academy — Apprendre. Pratiquer. Maîtriser.", template: "%s — Harmonie IT Academy" },
  description:
    "Formation au support informatique, à l'administration systèmes, réseaux et à la cybersécurité. Cours progressifs, incidents simulés, préparation aux entretiens.",
  applicationName: "Harmonie IT Academy",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Harmonie IT Academy" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
};

/** Applique le thème avant le premier rendu pour éviter le flash (choix enregistré, sinon préférence système). */
const themeScript = `(function(){try{var t=localStorage.getItem('hia-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${InstrumentSerif.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-paper text-ink">
        <a href="#contenu" className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
