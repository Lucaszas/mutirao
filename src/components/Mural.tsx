import Link from "next/link";
import { POST_KINDS, POST_STATUS, type Post } from "@/db/schema";
import { apoiarPost } from "@/app/actions";

const statusColor: Record<Post["status"], string> = {
  aberta: "",
  em_andamento: "!bg-sun/20 !text-sun",
  feita: "!bg-leaf/15 !text-leaf",
  descartada: "!bg-danger/10 !text-muted",
};

export function StatusChip({ status }: { status: Post["status"] }) {
  return <span className={`chip ${statusColor[status]}`}>{POST_STATUS[status]}</span>;
}

export function SupportButton({ postId, count, mine, enabled }: { postId: number; count: number; mine: boolean; enabled: boolean }) {
  const inner = (
    <>
      <span className="text-lg leading-none">▲</span>
      <span className="text-sm font-semibold">{count}</span>
    </>
  );
  const cls = `flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 ${
    mine ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"
  }`;
  if (!enabled) return <div className={cls} title="Entre para apoiar">{inner}</div>;
  return (
    <form action={apoiarPost}>
      <input type="hidden" name="postId" value={postId} />
      <button className={`${cls} hover:border-brand hover:text-brand`} title={mine ? "Retirar apoio" : "Apoiar"} aria-pressed={mine}>
        {inner}
      </button>
    </form>
  );
}

export function PostCard(props: {
  href: string;
  post: Post;
  author: string;
  supports: number;
  comments: number;
  mine: boolean;
  canSupport: boolean;
  date: string;
}) {
  const { post } = props;
  return (
    <article className="card flex gap-4">
      <SupportButton postId={post.id} count={props.supports} mine={props.mine} enabled={props.canSupport} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip">{POST_KINDS[post.kind]}</span>
          {post.status !== "aberta" && <StatusChip status={post.status} />}
          {post.page && <span className="text-muted">em {post.page}</span>}
        </div>
        <Link href={props.href} className="mt-1 block font-semibold hover:text-brand">{post.title}</Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
        <p className="mt-2 text-xs text-muted">
          {props.author} · {props.date} · 💬 {props.comments}
        </p>
      </div>
    </article>
  );
}
