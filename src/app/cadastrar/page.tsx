import Link from "next/link";
import { cadastrar } from "../actions";
import { ErrorBanner } from "@/components/ui";
import { LocationFields } from "@/components/LocationFields";

export default async function Cadastrar({ searchParams }: PageProps<"/cadastrar">) {
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="h-display mb-2 text-3xl">Participar do Mutirão</h1>
      <p className="mb-6 text-muted">Sua conta é gratuita, para sempre. Não vendemos dados e não há anúncios.</p>
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <form action={cadastrar} className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha (mín. 8 caracteres)</label>
          <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <LocationFields />
        <div>
          <label className="label" htmlFor="skills">O que você sabe fazer? (separe por vírgula)</label>
          <input className="input" id="skills" name="skills" placeholder="costura, contabilidade, marcenaria, design" />
          <p className="mt-1 text-xs text-muted">O Guardião usa isso para conectar você a quem precisa de ajuda.</p>
        </div>
        <button className="btn w-full">Criar conta</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Já participa? <Link href="/entrar" className="text-brand underline">Entrar</Link>
      </p>
    </div>
  );
}
