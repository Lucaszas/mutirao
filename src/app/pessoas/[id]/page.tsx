import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { atualizarPerfil } from "../../actions";
import { LocationFields } from "@/components/LocationFields";

export default async function Pessoa({ params }: PageProps<"/pessoas/[id]">) {
  const { id } = await params;
  const person = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      city: schema.users.city,
      bairro: schema.users.bairro,
      uf: schema.users.uf,
      geohash: schema.users.geohash,
      bio: schema.users.bio,
      skills: schema.users.skills,
    })
    .from(schema.users)
    .where(eq(schema.users.id, Number(id)))
    .get();
  if (!person) notFound();
  const viewer = await getCurrentUser();
  const coops = await db
    .select({ name: schema.coops.name, slug: schema.coops.slug, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.coops, eq(schema.coops.id, schema.memberships.coopId))
    .where(eq(schema.memberships.userId, person.id));
  const isMe = viewer?.id === person.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card">
        <h1 className="h-display text-3xl">{person.name}</h1>
        {person.city && <p className="text-muted">{[person.bairro, person.city].filter(Boolean).join(" · ")}</p>}
        {person.bio && <p className="mt-3 whitespace-pre-line">{person.bio}</p>}
        {person.skills && (
          <div className="mt-3 flex flex-wrap gap-2">
            {person.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        )}
        {coops.length > 0 && (
          <p className="mt-4 text-sm">
            Cooperativas:{" "}
            {coops.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ", "}
                <Link className="text-brand" href={`/cooperativas/${c.slug}`}>{c.name}</Link>
              </span>
            ))}
          </p>
        )}
      </div>
      {isMe && (
        <form action={atualizarPerfil} className="card space-y-3">
          <h2 className="h-display text-xl">Editar perfil</h2>
          <input className="input" name="name" defaultValue={person.name} placeholder="Nome" />
          <LocationFields bairro={person.bairro} city={person.city} uf={person.uf} geohash={person.geohash} />
          <input className="input" name="skills" defaultValue={person.skills} placeholder="Habilidades, separadas por vírgula" />
          <textarea className="input min-h-24" name="bio" defaultValue={person.bio} placeholder="Sobre você" />
          <button className="btn">Salvar</button>
        </form>
      )}
    </div>
  );
}
