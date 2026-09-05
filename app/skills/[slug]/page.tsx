import { notFound } from "next/navigation";
import { OSShell } from "../../os-shell";
import { CopyMarkdownButton } from "../../copy-markdown-button";
import { fullSkillRecords, getSkillRecord } from "../../skill-records";

export function generateStaticParams() {
  return fullSkillRecords.map((record) => ({ slug: record.slug }));
}

export default function SkillDetailPage({ params }: { params: { slug: string } }) {
  const record = getSkillRecord(params.slug);
  if (!record) notFound();

  return (
    <OSShell
      active="Skills"
      kicker="Skill Detail"
      title={record.name}
      description="这里保存完整 Markdown 原文，之后需要使用时可以直接复制整份 skill。"
      actionSlot={<a className="return-link" href="/skills">返回收录库</a>}
    >
      <section className="page-grid single">
        <article className="panel wide markdown-panel merged-skill-panel">
          <div className="panel-heading markdown-heading">
            <div>
              <div className="markdown-title-group">
                <h3>完整内容</h3>
                <span>{record.summary?.scene ?? "Skill"}</span>
              </div>
              {record.summary?.tags?.length ? (
                <div className="skill-tags detail-tags">
                  {record.summary.tags.map((tag) => <small key={tag}>{tag}</small>)}
                </div>
              ) : null}
            </div>
            <CopyMarkdownButton text={record.markdown} />
          </div>
          <pre className="markdown-view"><code>{record.markdown}</code></pre>
        </article>
      </section>
    </OSShell>
  );
}


