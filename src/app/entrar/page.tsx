import Link from "next/link";
import { entrar } from "../actions";
import { ErrorBanner } from "@/components/ui";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="h-display mb-6 text-3xl">Entrar</h1>
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <form action={entrar} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn w-full">Entrar</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Ainda não participa? <Link href="/cadastrar" className="text-brand underline">Crie sua conta</Link>
      </p>
    </div>
  );
}
