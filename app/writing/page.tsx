import { OSShell } from "../os-shell";
import { writingStats } from "../os-data";

export default function WritingPage() {
  return <OSShell active="Writing" kicker="Publishing Desk" title="公众号工作台" description="只保留一条示例数据，真实选题和草稿由你之后填入。"><section className="content-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">Example</p><h3>内容示例</h3></div></div><ul className="quiet-list">{writingStats.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul></article></section></OSShell>;
}
