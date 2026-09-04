import { OSShell } from "../os-shell";

export default function ReviewPage() {
  return <OSShell active="Review" kicker="Review Loop" title="复盘系统" description="只保留一条复盘示例，后续写入你自己的真实复盘。"><section className="content-grid"><article className="panel wide"><div className="panel-heading"><div><p className="eyebrow">Example</p><h3>复盘示例</h3></div></div><div className="review-box"><strong>本周真正值得保留的一件事是什么？</strong><p>示例问题，后续可以替换成你的固定复盘模板。</p></div></article></section></OSShell>;
}
