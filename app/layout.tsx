import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const viewport: Viewport = { themeColor: "#0b0b0b", width: "device-width", initialScale: 1 };

const SITE = "https://bolao.mapasolucoesdigitais.com.br";
const DESCRIPTION = "Ranking, rodadas e estatísticas do bolão da família Papini — Brasileirão 2026.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Bolão Maurício Papini",
  description: DESCRIPTION,
  // pré-visualização do link no WhatsApp (og:image precisa ser URL absoluta, até ~300 KB)
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE,
    siteName: "Bolão Maurício Papini",
    title: "Bolão Maurício Papini",
    description: DESCRIPTION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Bolão dos Papinis" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="topbar">
          <div className="wrap">
            <Link href="/" className="brand display">
              <span className="star">★</span> Bolão <span className="full">Maurício</span> Papini
            </Link>
            <nav className="nav">
              <Link href="/">Ranking</Link>
              <Link href="/rodadas/">Rodadas</Link>
              <Link href="/regras/">Regras</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap">
            Bolão criado e organizado por Maurício Papini por muitos anos — hoje tocado pelo Daniel. ★
          </div>
        </footer>
      </body>
    </html>
  );
}
