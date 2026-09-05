import { OSShell } from "./os-shell";
import { focusCards, goals, projects, skillLibrary, writingStats } from "./os-data";

export default function Home() {
  return (
    <OSShell active="Dashboard" kicker="私人工作台" title="今日总览" description="这里只保留少量示例。之后你填入真实内容，它才会逐渐长成你的系统。">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Personal Operating System</p>
          <h3>一个给自己用的个人工作台。</h3>
          <p>目标、项目、理财、成长、内容与收录分开管理；总览只放真正需要你看到的少量信息。</p>
        </div>
        <div className="today-card"><span>今日示例</span><ol><li>填入一条今天真正要推进的事项。</li></ol></div>
      </section>
      <section className="focus-grid">{focusCards.map((card) => <article className={`focus-card ${card.accent}`} key={card.title}><span>{card.title}</span><strong>{card.value}</strong><p>{card.note}</p></article>)}</section>
      <section className="content-grid">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Goals</p><h3>目标示例</h3></div><a className="text-link" href="/goals">进入目标页</a></div><div className="goal-list compact">{goals.map((goal) => <div className="goal-row" key={goal.name}><span className="range">{goal.range}</span><div><strong>{goal.name}</strong><p>{goal.next}</p></div><em>{goal.progress}</em></div>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Projects</p><h3>项目示例</h3></div><a className="text-link" href="/projects">进入项目页</a></div><div className="project-list">{projects.map((project) => <div className="project-card" key={project.name}><div><strong>{project.name}</strong><p>{project.next}</p></div><span>{project.status}</span><small>{project.metric}</small></div>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Writing</p><h3>公众号示例</h3></div><a className="text-link" href="/writing">进入公众号页</a></div><ul className="quiet-list">{writingStats.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Skill Inbox</p><h3>已收录 Skill</h3></div><a className="text-link" href="/skills">进入收录库</a></div><div className="skill-table mini">{skillLibrary.slice(0, 3).map((skill) => <div className="skill-row" role="row" key={skill.name}><strong>{skill.name}</strong><span>{skill.type}</span><em>{skill.status}</em></div>)}</div></article>
      </section>
    </OSShell>
  );
}
