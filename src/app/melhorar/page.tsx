import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { HOUSE_COOP_SLUG } from "@/lib/casa";
import { PageTitle } from "@/components/ui";

// Atalho fixo para o mural da "cooperativa da casa" (o próprio projeto Mutirão).
export default async function Melhorar() {
  const casa = await db.select({ slug: schema.coops.slug }).from(schema.coops).where(eq(schema.coops.slug, HOUSE_COOP_SLUG)).get();
  if (casa) redirect(`/cooperativas/${casa.slug}/mural`);
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title="Ajude a melhorar"
        subtitle="O próprio Mutirão funciona como uma cooperativa da rede, mas ela ainda não foi criada nesta instalação."
      />
      <p className="text-sm">
        Crie uma cooperativa do tipo <b>Tecnologia</b> chamada <b>Mutirão</b> em{" "}
        <Link href="/cooperativas/nova" className="text-brand underline">nova cooperativa</Link>. O mural dela vira o espaço de
        ideias, problemas e design do site. Enquanto isso, sugestões também são bem-vindas no{" "}
        <a href="https://github.com/Lucaszas/mutirao/issues" className="text-brand underline">GitHub</a>.
      </p>
    </div>
  );
}
