import { OSShell } from "../os-shell";
import { archiveTags } from "../os-data";

export default function ArchivePage() {
  return <OSShell active="Archive" kicker="Archive" title="档案库" description="只保留一条档案分类示例，避免预设大量假分类。"><section className="content-grid"><article className="panel wide"><div className="panel-heading"><div><p className="eyebrow">Example</p><h3>档案示例</h3></div></div><div className="archive-tags">{archiveTags.map((tag) => <span key={tag}>{tag}</span>)}</div></article></section></OSShell>;
}
