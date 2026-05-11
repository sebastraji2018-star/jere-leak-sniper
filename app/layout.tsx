import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import NavLinks from './components/NavLinks'


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Leak Sniper — Jere Klein',
  description: 'Sistema de monitoreo de filtraciones de Jere Klein',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} bg-[#0a0a0a] text-white min-h-screen`}>
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
          {/* Gold accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#F5C518]/40 to-transparent" />
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              {/* Logo — isotipo sin fondo, solo el símbolo blanco */}
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                <img
                  src="/isotipo.png"
                  alt="JK"
                  width={36}
                  height={36}
                  style={{ mixBlendMode: 'screen', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight leading-none">Leak Sniper</div>
                <div className="text-[10px] text-[#F5C518] font-medium tracking-widest uppercase leading-none mt-0.5">Jere Klein</div>
              </div>
            </Link>
            <NavLinks />
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-white/5 mt-16 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="opacity-40">⚡</span>
              <span>Leak Sniper — Jere Klein</span>
            </div>
            <span>Monitoreo automático cada 2 horas</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
