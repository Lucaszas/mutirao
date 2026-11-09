import { requireUser } from "@/lib/auth";
import { criarCoop } from "../../actions";
import { COOP_TYPES } from "@/db/schema";
import { ErrorBanner, PageTitle } from "@/components/ui";
import { LocationFields } from "@/components/LocationFields";

export default async function NovaCoop({ searchParams }: PageProps<"/cooperativas/nova">) {
  const user = await requireUser();
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Criar uma cooperativa" subtitle="Você será a pessoa fundadora. Depois é só convidar mais gente." />
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <form action={criarCoop} className="card space-y-5">
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input className="input" id="name" name="name" required placeholder="ex.: Coletivo Fio de Ouro" />
        </div>
        <div>
          <label className="label" htmlFor="type">Tipo</label>
          <select className="input" id="type" name="type" required defaultValue="">
            <option value="" disabled>Escolha…</option>
            {Object.entries(COOP_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <LocationFields bairro={user.bairro} city={user.city} uf={user.uf} geohash={user.geohash} />
        <div>
          <label className="label" htmlFor="description">O que vocês fazem e por quê?</label>
          <textarea className="input min-h-32" id="description" name="description" required />
        </div>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold">Regras econômicas (podem mudar depois, por votação)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="quota">Cota de entrada (R$)</label>
              <input className="input" id="quota" name="quota" inputMode="decimal" placeholder="0,00" />
            </div>
            <div>
              <label className="label" htmlFor="reservePct">Fundo de reserva (%)</label>
              <input className="input" id="reservePct" name="reservePct" type="number" min={0} max={100} defaultValue={20} />
            </div>
            <div>
              <label className="label" htmlFor="socialPct">Fundo social (%)</label>
              <input className="input" id="socialPct" name="socialPct" type="number" min={0} max={100} defaultValue={10} />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            O restante das sobras é dividido entre os membros de acordo com o trabalho registrado. O fundo social financia
            formação, expansão e ajuda a novas cooperativas da rede.
          </p>
        </fieldset>
        <button className="btn">Fundar cooperativa</button>
      </form>
    </div>
  );
}
