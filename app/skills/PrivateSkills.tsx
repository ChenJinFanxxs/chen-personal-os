/* eslint-disable @next/next/no-html-link-for-pages */
"use client";
import { usePrivateRecords } from "../private-store";
import { EditableSkillLibrary } from "./EditableSkillLibrary";
import { OSShell } from "../os-shell";
import { CopyMarkdownButton } from "../copy-markdown-button";
type Skill = { slug: string; name: string; scene: string; status: string; value: string; tags: string[]; markdown: string };
export function useSkills() {
  const { cache } = usePrivateRecords();
  return Object.values({ ...cache.records, ...cache.pending }).filter(r => r.id.startsWith("skill:") && !r.deleted).map(r => r.value as Skill);
}
export function PrivateSkills() {
  const skills = useSkills();
  return skills.length ? <EditableSkillLibrary skills={skills} detailSlugs={skills.map(s => s.slug)} /> : <p>暂无收录内容。可在“设备与备份”中导入原有收录。</p>;
}
export function SkillDetail({ slug }: { slug: string }) {
  const skills = useSkills(); const { cache } = usePrivateRecords();
  const record = skills.find(s => s.slug === slug);
  const edits = (cache.pending["skill-edits"]?.value ?? cache.records["skill-edits"]?.value ?? {}) as Record<string, { name: string; tags: string[] }>;
  const folders = (cache.pending["skill-folders"]?.value ?? cache.records["skill-folders"]?.value ?? {}) as { trashed?: string[] };
  const edit = edits[slug];
  return <OSShell active="Skills" kicker="Skill" title={edit?.name || record?.name || "收录内容"} actionSlot={<a href="/skills">返回收录库</a>}>
    {record ? <article className="panel wide markdown-panel"><div className="panel-heading markdown-heading"><div><h3>完整内容</h3><small>{record.scene}</small><div className="skill-tags">{(edit?.tags ?? record.tags)?.map(tag => <small key={tag}>{tag}</small>)}</div></div><CopyMarkdownButton text={record.markdown}/></div>{folders.trashed?.includes(slug) && <p>此内容位于回收站。</p>}<pre className="markdown-view"><code>{record.markdown}</code></pre></article> : <p>未找到此收录，请同步或返回收录库。</p>}
  </OSShell>;
}
