import { OSShell } from "../os-shell";
import { goals } from "../os-data";

export default function GoalsPage() {
  return <OSShell active="Goals" kicker="Goal System" title="目标系统" description="只保留一条示例目标，后续替换成你的真实长期、中期或短期目标。"><section className="page-grid single"><article className="panel wide"><div className="panel-heading"><div><p className="eyebrow">Example</p><h3>目标示例</h3></div></div><div className="goal-list detailed">{goals.map((goal) => <div className="goal-row detailed" key={goal.name}><span className="range">{goal.range}</span><div><strong>{goal.name}</strong><p>{goal.detail}</p><p className="next-line">下一步：{goal.next}</p></div><em>{goal.progress}</em></div>)}</div></article></section></OSShell>;
}
