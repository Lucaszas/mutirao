import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { isCoopMember } from "@/lib/queries";

/**
 * A cooperativa é dona dos seus dados. Qualquer membro pode baixar tudo, a qualquer momento,
 * para guardar uma cópia, auditar ou migrar para outra instância (resiliência em crises).
 */
export async function GET(_req: Request, ctx: RouteContext<"/cooperativas/[slug]/exportar">) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  const coop = await db.select().from(schema.coops).where(eq(schema.coops.slug, slug)).get();
  if (!coop || !user || !(await isCoopMember(coop.id, user.id))) {
    return new Response("Apenas membros podem exportar.", { status: 403 });
  }
  const [members, ledger, workLogs, proposals, offers, orders, approvals] = await Promise.all([
    db
      .select({ name: schema.users.name, role: schema.memberships.role, joinedAt: schema.memberships.joinedAt })
      .from(schema.memberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(eq(schema.memberships.coopId, coop.id)),
    db.select().from(schema.ledger).where(eq(schema.ledger.coopId, coop.id)),
    db.select().from(schema.workLogs).where(eq(schema.workLogs.coopId, coop.id)),
    db.select().from(schema.proposals).where(eq(schema.proposals.coopId, coop.id)),
    db.select().from(schema.offers).where(eq(schema.offers.coopId, coop.id)),
    db.select().from(schema.orders).where(eq(schema.orders.coopId, coop.id)),
    db.select().from(schema.approvals).where(eq(schema.approvals.coopId, coop.id)),
  ]);
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), format: "mutirao-export/1", coop, members, ledger, workLogs, proposals, offers, orders, approvals },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${coop.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
