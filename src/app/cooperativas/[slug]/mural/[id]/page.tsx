import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPost } from "@/lib/queries";
import { POST_KINDS, POST_STATUS } from "@/db/schema";
import { dateBR } from "@/lib/format";
import { ErrorBanner } from "@/components/ui";
import { StatusChip, SupportButton } from "@/components/Mural";
import { comentarNoMural, mudarStatusPost } from "../../../../actions";

export default async function PostPage({ params, searchParams }: PageProps<"/cooperativas/[slug]/mural/[id]">) {
  const { slug, id } = await params;
  const { erro } = await searchParams;
  const user = await getCurrentUser();
  const data = await getPost(Number(id), user?.id);
  if (!data || data.coop.slug !== slug) notFound();
  const { post, author, coop, comments, supporters, mine, isMember } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErrorBanner message={typeof erro === "string" ? erro : undefined} />
      <Link href={`/cooperativas/${coop.slug}/mural`} className="text-sm text-muted hover:text-ink">← Mural de {coop.name}</Link>

      <article className="card flex gap-4">
        <SupportButton postId={post.id} count={supporters.length} mine={mine} enabled={!!user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">{POST_KINDS[post.kind]}</span>
            <StatusChip status={post.status} />
            {post.page && <span className="text-muted">em {post.page}</span>}
          </div>
          <h1 className="h-display mt-2 text-3xl">{post.title}</h1>
          <p className="mt-1 text-xs text-muted">
            <Link href={`/pessoas/${post.authorId}`} className="hover:text-brand">{author}</Link> · {dateBR(post.createdAt)}
          </p>
          <p className="mt-4 whitespace-pre-line break-words">{post.body}</p>
          {post.statusNote && post.status !== "aberta" && (
            <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
              <b>{POST_STATUS[post.status]}:</b> {post.statusNote}
            </p>
          )}
          {supporters.length > 0 && (
            <p className="mt-4 text-xs text-muted">Apoiam: {supporters.map((s) => s.name).join(", ")}</p>
          )}
        </div>
      </article>

      {isMember && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Mudar andamento (membros)</summary>
          <form action={mudarStatusPost} className="mt-4 space-y-3">
            <input type="hidden" name="postId" value={post.id} />
            <div className="flex flex-wrap gap-3">
              {Object.entries(POST_STATUS).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="status" value={k} defaultChecked={post.status === k} /> {label}
                </label>
              ))}
            </div>
            <input className="input" name="statusNote" placeholder="Explique em uma frase (aparece para todo mundo)" maxLength={500} />
            <button className="btn-ghost">Salvar andamento</button>
          </form>
        </details>
      )}

      <section className="space-y-3">
        <h2 className="h-display text-xl">Conversa ({comments.length})</h2>
        {comments.map(({ comment, author: name, isMember: fromMember }) => (
          <div key={comment.id} className={`rounded-xl p-3 text-sm ${comment.body.startsWith("↪") ? "text-muted" : "bg-surface-2"}`}>
            <p className="text-xs text-muted">
              <Link href={`/pessoas/${comment.authorId}`} className="font-semibold text-ink hover:text-brand">{name}</Link>
              {fromMember && <span className="chip ml-2 !py-0 text-[10px]">membro</span>} · {dateBR(comment.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-line break-words">{comment.body}</p>
          </div>
        ))}
        {user ? (
          <form action={comentarNoMural} className="space-y-2">
            <input type="hidden" name="postId" value={post.id} />
            <textarea className="input min-h-20" name="body" placeholder="Concorda? Tem outra ideia? Aconteceu com você também?" maxLength={2000} required />
            <button className="btn">Comentar</button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            <Link href="/entrar" className="text-brand underline">Entre</Link> para comentar.
          </p>
        )}
      </section>
    </div>
  );
}
