import { OSShell } from "../os-shell";
import { projects } from "../os-data";

export default function ProjectsPage() {
  return <OSShell active="Projects" kicker="Projects" title="项目 / 副业系统" description="只保留一条项目示例，避免用假项目占满页面。"><section className="content-grid">{projects.map((project) => <article className="panel project-page-card" key={project.name}><div className="panel-heading"><div><p className="eyebrow">{project.owner}</p><h3>{project.name}</h3></div><span className="pill">{project.status}</span></div><div className="money-block"><strong>{project.metric}</strong><p>{project.next}</p></div></article>)}</section></OSShell>;
}
