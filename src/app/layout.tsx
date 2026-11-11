import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import { sair } from "./actions";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mutirão — rede de cooperativas",
  description:
    "Plataforma aberta e gratuita para criar, manter e expandir cooperativas, trocar e se ajudar. Software livre feito pela comunidade.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="bg-sun/15 px-4 py-1.5 text-center text-xs text-ink">
          🧪 Versão de testes: os dados marcados como <b>exemplo</b> são fictícios.{" "}
          <Link href="/melhorar" className="font-semibold underline">Ajude a melhorar →</Link>
        </div>
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="h-display text-xl text-brand">
              Mutirão
            </Link>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-muted">
              <Link href="/bairro" className="hover:text-ink">Meu bairro</Link>
              <Link href="/cooperativas" className="hover:text-ink">Cooperativas</Link>
              <Link href="/mercado" className="hover:text-ink">Mercado &amp; trocas</Link>
              <Link href="/rede" className="hover:text-ink">Conexões</Link>
              <Link href="/pedidos" className="hover:text-ink">Pedidos</Link>
              <Link href="/guardiao" className="hover:text-ink">Guardião</Link>
              <Link href="/melhorar" className="text-brand hover:text-ink">Ajude a melhorar</Link>
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link href={`/pessoas/${user.id}`} className="font-medium hover:text-brand">{user.name}</Link>
                  <form action={sair}>
                    <button className="btn-ghost py-1">Sair</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/entrar" className="font-medium hover:text-brand">Entrar</Link>
                  <Link href="/cadastrar" className="btn py-1.5">Participar</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          Software livre (AGPL-3.0) · feito em mutirão pela comunidade ·{" "}
          <Link href="/sobre" className="underline">manifesto</Link>
        </footer>
      </body>
    </html>
  );
}
