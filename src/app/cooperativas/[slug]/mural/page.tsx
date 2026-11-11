import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { listPosts, type MuralSort } from "@/lib/queries";
import { POST_KINDS } from "@/db/schema";
import { dateBR } from "@/lib/format";
import { HOUSE_COOP_SLUG } from "@/lib/casa";
import { ErrorBanner } from "@/components/ui";
import { PostCard } from "@/components/Mural";
import { publicarNoMural } from "../../../actions";

export default async function MuralPage({ params, searchParams }: PageProps<"/cooperativas/[slug]/mural">) {
  const { slug } = await params;
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const kind = pick("tipo");
  const status = pick("andamento");
  const sort: MuralSort = pick("ordem") === "recentes" ? "recentes" : "apoios";

  const coop = await db.select().from(schema.coops).where(eq(schema.coops.slug, slug)).get();
  if (!coop) notFound();
  const user = await getCurrentUser();
  const items = await listPosts(coop.id, { kind, status, sort, viewerId: user?.id });
  const isHouse = coop.slug === HOUSE_COOP_SLUG;

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { tipo: kind, andamento: status, ordem: sort === "recentes" ? "recentes" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/cooperativas/${coop.slug}/mural${s ? `?${s}` : ""}`;
  };
  const tab = (active: boolean, to: string, label: string) => (
    <Link
      key={label}
      href={to}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-bg" : "bg-surface-2 text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErrorBanner message={pick("erro")} />
      <header>
        <Link href={`/cooperativas/${coop.slug}`} className="text-sm text-muted hover:text-ink">← {coop.name}</Link>
        <h1 className="h-display mt-1 text-4xl">{isHouse ? "Ajude a melhorar o Mutirão" : "Mural"}</h1>
        <p className="mt-2 text-muted">
          {isHouse
            ? "Este site é construído em mutirão. Conte o que achou confuso, o que quebrou, o que faltou e como poderia ficar mais bonito. Apoie as ideias dos outros para mostrar o que é mais importante."
            : `Ideias, problemas e sugestões para ${coop.name}. Qualquer pessoa da rede pode publicar e apoiar; os membros cuidam do andamento.`}
        </p>
        {isHouse && (
          <p className="mt-2 text-sm text-muted">
            Prefere código? O projeto também está no{" "}
            <a className="text-brand underline" href="https://github.com/Lucaszas/mutirao">GitHub</a>.
          </p>
        )}
      </header>

      {user ? (
        <details className="card" open={items.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Publicar no mural</summary>
          <form action={publicarNoMural} className="mt-4 space-y-3">
            <input type="hidden" name="coopId" value={coop.id} />
            <div className="flex flex-wrap gap-3">
              {Object.entries(POST_KINDS).map(([k, label], i) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} required /> {label}
                </label>
              ))}
            </div>
            <input className="input" name="title" placeholder="Em uma frase: qual é a ideia ou o problema?" maxLength={140} required />
            <textarea
              className="input min-h-28"
              name="body"
              placeholder={
                isHouse
                  ? "Conte mais: o que você tentou fazer, o que esperava e o que aconteceu. Para design, descreva como imagina (pode colar o link de uma imagem)."
                  : "Conte mais."
              }
              maxLength={4000}
              required
            />
            <input className="input" name="page" placeholder="Onde? (opcional) ex.: página do mercado, no celular, cadastro" maxLength={120} />
            <button className="btn">Publicar</button>
          </form>
        </details>
      ) : (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Crie uma conta gratuita para publicar, comentar e apoiar ideias.</p>
          <div className="flex gap-2">
            <Link href="/entrar" className="btn-ghost">Entrar</Link>
            <Link href="/cadastrar" className="btn">Criar conta</Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {tab(!kind, href({ tipo: undefined }), "Tudo")}
          {Object.entries(POST_KINDS).map(([k, label]) => tab(kind === k, href({ tipo: k }), label))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {tab(!status, href({ andamento: undefined }), "Abertas")}
          {tab(status === "feita", href({ andamento: "feita" }), "Feitas ✓")}
          {tab(status === "descartada", href({ andamento: "descartada" }), "Descartadas")}
          <span className="ml-auto text-muted">Ordem:</span>
          {tab(sort === "apoios", href({ ordem: undefined }), "Mais apoiadas")}
          {tab(sort === "recentes", href({ ordem: "recentes" }), "Recentes")}
        </div>
      </div>

      {items.length === 0 && <p className="text-muted">Nada por aqui ainda. Que tal ser a primeira pessoa?</p>}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.post.id}>
            <PostCard
              href={`/cooperativas/${coop.slug}/mural/${it.post.id}`}
              post={it.post}
              author={it.author}
              supports={it.supports}
              comments={it.comments}
              mine={it.mine}
              canSupport={!!user}
              date={dateBR(it.post.createdAt)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
