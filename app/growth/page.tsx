import { OSShell } from "../os-shell";
import { growthAreas } from "../os-data";

export default function GrowthPage() {
  return <OSShell active="Growth" kicker="Growth System" title="能力成长系统" description="只保留一条能力示例，后续替换成你真正要训练的能力。"><section className="content-grid"><article className="panel wide"><div className="panel-heading"><div><p className="eyebrow">Example</p><h3>能力示例</h3></div></div><div className="habit-grid">{growthAreas.map((area) => <span key={area}>{area}</span>)}</div></article></section></OSShell>;
}
