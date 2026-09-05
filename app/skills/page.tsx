import { OSShell } from "../os-shell";
import { PrivateSkills } from "./PrivateSkills";

export default function SkillsPage() {

  return (
    <OSShell active="Skills" kicker="Skill Inbox" title="收录库" description="专门收集你上网看到的优质 skill、工具、方法论、prompt、工作流和案例。列表负责索引，详情页保存完整原文，方便之后复制复用。">
      <section className="page-grid single">
        <article className="panel wide">
          <div className="panel-heading">
            <div><p className="eyebrow">Library</p><h3>已收录内容</h3></div>
          </div>
          <PrivateSkills />
        </article>
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Capture Template</p><h3>收录字段</h3></div></div>
          <div className="archive-tags"><span>名称</span><span>来源链接</span><span>一句话价值</span><span>适用场景</span><span>如何使用</span><span>完整原文</span><span>标签</span><span>是否实践</span><span>关联目标</span><span>复盘评分</span></div>
        </article>
      </section>
    </OSShell>
  );
}
